-- =====================================================================
--  Cadence: AI social content generator & scheduler (run once in SQL Editor)
--    1. posts                  captions + schedule + Drive sync state (RLS: owner only)
--    2. notification_settings  per-user email preferences          (RLS: owner only)
--    3. notification_log       every email sent                    (RLS: owner read)
--    4. drive_connections      Google OAuth refresh tokens         (server-only columns)
--    5. rate_limits + check_rate_limit()  fixed-window limiter shared by all serverless instances
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

-- 1. posts -------------------------------------------------------------
create table if not exists public.posts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  prompt                text check (prompt is null or char_length(prompt) <= 500),
  caption               text not null check (char_length(caption) between 1 and 2200),
  hashtags              text[] not null default '{}' check (cardinality(hashtags) <= 30),
  platform              text not null default 'instagram'
                        check (platform in ('instagram', 'x', 'linkedin', 'facebook', 'tiktok')),
  tone                  text check (tone is null or char_length(tone) <= 40),
  notes                 text check (notes is null or char_length(notes) <= 1000),
  status                text not null default 'scheduled' check (status in ('draft', 'scheduled', 'published')),
  scheduled_at          timestamptz,
  notify                boolean not null default true,
  confirmation_sent_at  timestamptz,
  reminder_sent_at      timestamptz,
  drive_file_id         text,
  drive_synced_at       timestamptz,
  drive_sync_error      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint posts_scheduled_needs_time check (status <> 'scheduled' or scheduled_at is not null)
);
create index if not exists posts_user_schedule_idx on public.posts (user_id, scheduled_at);
create index if not exists posts_due_reminders_idx on public.posts (scheduled_at)
  where status = 'scheduled' and notify and reminder_sent_at is null;
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- 2. notification_settings -------------------------------------------------
create table if not exists public.notification_settings (
  user_id                uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email                  text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  enabled                boolean not null default true,
  notify_on_schedule     boolean not null default true,
  remind_before_minutes  integer not null default 15 check (remind_before_minutes between 0 and 1440),
  include_caption        boolean not null default true,
  subject_prefix         text not null default 'Cadence' check (char_length(subject_prefix) between 1 and 40),
  timezone               text not null default 'Asia/Karachi' check (char_length(timezone) <= 64),
  updated_at             timestamptz not null default now()
);
drop trigger if exists notification_settings_set_updated_at on public.notification_settings;
create trigger notification_settings_set_updated_at before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- 3. notification_log --------------------------------------------------------
create table if not exists public.notification_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  post_id     uuid references public.posts (id) on delete set null,
  kind        text not null check (kind in ('scheduled', 'reminder', 'test')),
  sent_to     text not null,
  status      text not null check (status in ('sent', 'failed')),
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists notification_log_user_idx on public.notification_log (user_id, created_at desc);

-- 4. drive_connections (refresh tokens are NEVER readable by clients) --------
create table if not exists public.drive_connections (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  refresh_token  text not null,
  google_email   text,
  folder_id      text,
  connected_at   timestamptz not null default now()
);

-- 5. rate limiting -------------------------------------------------------------
create table if not exists public.rate_limits (
  key           text primary key,
  window_start  timestamptz not null default now(),
  hits          integer not null default 0
);

-- RLS ----------------------------------------------------------------------------
alter table public.posts enable row level security;
alter table public.notification_settings enable row level security;
alter table public.notification_log enable row level security;
alter table public.drive_connections enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.posts, public.notification_settings, public.notification_log,
  public.drive_connections, public.rate_limits from anon, authenticated;

grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update on public.notification_settings to authenticated;
grant select on public.notification_log to authenticated;
-- Column-level grant: clients may see that Drive is connected, never the token.
grant select (user_id, google_email, folder_id, connected_at) on public.drive_connections to authenticated;
grant delete on public.drive_connections to authenticated;
-- rate_limits: no grants at all; only the SECURITY DEFINER function touches it.

drop policy if exists "posts: owner all" on public.posts;
create policy "posts: owner all" on public.posts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "settings: owner all" on public.notification_settings;
create policy "settings: owner all" on public.notification_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "log: owner read" on public.notification_log;
create policy "log: owner read" on public.notification_log for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "drive: owner read" on public.drive_connections;
create policy "drive: owner read" on public.drive_connections for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "drive: owner delete" on public.drive_connections;
create policy "drive: owner delete" on public.drive_connections for delete to authenticated
  using (user_id = (select auth.uid()));

-- Fixed-window rate limiter. The key is bound to auth.uid() inside the function,
-- so a caller can't spend someone else's quota or reset their own.
create or replace function public.check_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  v_row public.rate_limits;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  v_key := left(p_bucket, 40) || ':' || auth.uid()::text;
  insert into public.rate_limits as r (key, window_start, hits)
  values (v_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start + make_interval(secs => p_window_seconds) <= now() then 1 else r.hits + 1 end,
    window_start = case when r.window_start + make_interval(secs => p_window_seconds) <= now() then now() else r.window_start end
  returning * into v_row;
  return query select
    v_row.hits <= p_limit,
    greatest(p_limit - v_row.hits, 0),
    v_row.window_start + make_interval(secs => p_window_seconds);
end;
$$;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.check_rate_limit(text, integer, integer) to authenticated;
