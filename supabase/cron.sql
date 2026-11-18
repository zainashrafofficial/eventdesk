-- =====================================================================
-- Cadence: reminder emails every minute via Supabase pg_cron + pg_net.
--
-- Run ONCE in the Supabase dashboard -> SQL Editor (this is not a migration,
-- because it contains your deployment URL and secret).
--
-- Before running:
--   1. Set CRON_SECRET in Vercel (Project -> Settings -> Environment Variables), e.g.
--        openssl rand -hex 32
--      and redeploy.
--   2. Replace REPLACE_WITH_CRON_SECRET below with that same value.
--   3. If your deployment URL differs, change it below too.
--
-- Every minute Postgres sends GET /api/cron/notify with the bearer secret. The route
-- finds scheduled posts whose reminder time has arrived (scheduled_at minus the
-- user's remind_before_minutes), emails them through Resend, logs each send to
-- notification_log and stamps posts.reminder_sent_at so nothing is sent twice.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-running this file is safe: drop the old job first if it exists.
select cron.unschedule(jobid) from cron.job where jobname = 'cadence-reminders';

select cron.schedule(
  'cadence-reminders',
  '* * * * *',
  $$
  select net.http_get(
    url := 'https://eventdesk-self.vercel.app/api/cron/notify',
    headers := jsonb_build_object('Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'),
    timeout_milliseconds := 30000
  );
  $$
);

-- Check it is running (responses land in net._http_response):
--   select * from cron.job where jobname = 'cadence-reminders';
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select status_code, content from net._http_response order by created desc limit 10;
--
-- Stop the reminders:
--   select cron.unschedule('cadence-reminders');
