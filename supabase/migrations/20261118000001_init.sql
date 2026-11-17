-- =====================================================================
--  EventDesk: complete database setup (run once).
--  Hosted Supabase: paste this whole file into SQL Editor and click Run.
--  Local CLI:       `npx supabase start` applies it automatically.
--
--  Contents
--    1. Tables: events, attachments
--    2. updated_at trigger
--    3. Row Level Security: every row belongs to exactly one user
--    4. Storage bucket "event-files" (private) + per-user folder policies
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (char_length(title) between 3 and 120),
  description   text check (description is null or char_length(description) <= 2000),
  category      text not null default 'other'
                check (category in ('meetup', 'workshop', 'conference', 'social', 'sports', 'other')),
  status        text not null default 'planned'
                check (status in ('planned', 'confirmed', 'completed', 'cancelled')),
  starts_at     timestamptz not null,
  capacity      integer check (capacity is null or capacity between 1 and 100000),
  -- Location is picked through the Open-Meteo geocoding API (external API #1)
  location_name text check (location_name is null or char_length(location_name) <= 200),
  latitude      double precision check (latitude is null or latitude between -90 and 90),
  longitude     double precision check (longitude is null or longitude between -180 and 180),
  -- Object key inside the "event-files" bucket: {user_id}/covers/{file}
  cover_path    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Coordinates come as a pair or not at all.
  constraint events_coords_pair check ((latitude is null) = (longitude is null))
);

create index if not exists events_user_starts_idx on public.events (user_id, starts_at);

create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Object key inside the "event-files" bucket: {user_id}/{event_id}/{file}
  file_path   text not null unique,
  file_name   text not null check (char_length(file_name) between 1 and 255),
  mime_type   text not null,
  size_bytes  bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at  timestamptz not null default now()
);

create index if not exists attachments_event_idx on public.attachments (event_id, created_at desc);

-- ---------------------------------------------------------------------
-- 2. updated_at trigger
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Row Level Security
--    Signed-in users can only see and change their own rows.
--    Anonymous visitors get no access at all.
-- ---------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.attachments enable row level security;

revoke all on public.events, public.attachments from anon;
grant select, insert, update, delete on public.events, public.attachments to authenticated;

drop policy if exists "events: owner can read" on public.events;
drop policy if exists "events: owner can insert" on public.events;
drop policy if exists "events: owner can update" on public.events;
drop policy if exists "events: owner can delete" on public.events;

create policy "events: owner can read" on public.events
  for select to authenticated using (user_id = (select auth.uid()));
create policy "events: owner can insert" on public.events
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "events: owner can update" on public.events
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "events: owner can delete" on public.events
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "attachments: owner can read" on public.attachments;
drop policy if exists "attachments: owner can insert" on public.attachments;
drop policy if exists "attachments: owner can delete" on public.attachments;

create policy "attachments: owner can read" on public.attachments
  for select to authenticated using (user_id = (select auth.uid()));
-- Insert only onto your own event, and only for a file inside your own storage folder.
create policy "attachments: owner can insert" on public.attachments
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and file_path like (select auth.uid())::text || '/%'
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = (select auth.uid())
    )
  );
create policy "attachments: owner can delete" on public.attachments
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 4. Storage: private bucket, 10 MB per file, images + documents only.
--    Path convention: {user_id}/...  The first folder must be the uploader's id.
--    Files are served through short-lived signed URLs, never public links.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-files',
  'event-files',
  false,
  10485760,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "event-files: owner can read" on storage.objects;
drop policy if exists "event-files: owner can upload" on storage.objects;
drop policy if exists "event-files: owner can update" on storage.objects;
drop policy if exists "event-files: owner can delete" on storage.objects;

create policy "event-files: owner can read" on storage.objects
  for select to authenticated
  using (bucket_id = 'event-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "event-files: owner can upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "event-files: owner can update" on storage.objects
  for update to authenticated
  using (bucket_id = 'event-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "event-files: owner can delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
