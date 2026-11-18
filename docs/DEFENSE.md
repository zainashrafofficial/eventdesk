# Cadence: live demo & technical defense cheat sheet

## Before the demo (2 minutes of prep)

- Sign in once on the live URL so Gemini and Supabase are warm. Have the Drive account (a listed **test user**) signed in to Google in the same browser.
- Set your notification email to the **Resend account's own address** (test mode only delivers there). Open that inbox in a second tab.
- Tabs ready: live app, `/api/health`, GitHub README, Supabase Table Editor (`posts`), Google Drive "Cadence Drafts" folder.

## 3-minute demo script

| Time | Show | Say (rubric) |
| --- | --- | --- |
| 0:00 | Open the **live URL**, then `/api/health` → `"status":"ok"` | "Deployed on Vercel; health endpoint for monitoring." (**Deployment**) |
| 0:15 | Visit `/dashboard` signed out → lands on `/login?next=/dashboard`. Sign up with a weak password to show inline errors, then a valid one → studio | "Three layers: proxy redirect, DAL `requireUser()`, Postgres RLS." (**Auth**) |
| 0:40 | Type *"Launching our new single-origin coffee blend this weekend"*, choose **Instagram**, tone, 3 options → **Generate captions** | "Server route calls Gemini with a JSON schema; output is zod-validated and trimmed to Instagram's limit. Rate limited 10/min per user." (**External API #1**) |
| 1:05 | Pick option 2, tweak a word, set Saturday 10:00, add task notes → **Schedule post** → toast | "One Server Action: validate, rate limit, insert, sync to Drive, send confirmation email." (**CRUD: Create**) |
| 1:25 | Switch to the inbox: confirmation email arrived. Switch to Drive: the Google Doc is in "Cadence Drafts" | "Resend for email, Google Drive with OAuth `drive.file` scope." (**External APIs #2 + #3**, **Cloud storage**) |
| 1:45 | Feed: **Edit** the caption → Save → Doc updates. **Delete** another post → confirmation dialog → gone (Doc removed too) | (**CRUD: Read / Update / Delete**) |
| 2:05 | Open **Notifications**: change reminder to 5 minutes, subject prefix, include caption → Save; **Send test email**; show the email activity log | "User-customisable notifications; every email is logged." (**Brief item 4**) |
| 2:25 | Explain reminders: pg_cron hits `/api/cron/notify` every minute with a secret; show `supabase/cron.sql` | (**Automation**) |
| 2:40 | DevTools → iPhone width; dark mode | (**UI/UX & Responsiveness**) |
| 2:50 | Sign out → `/dashboard` protected again. Flash the README (diagrams, env table, screenshots) | (**Docs**, **Code quality**) |

**If something fails live:** Gemini down / quota → the generator shows a clear error with retry and you can still write a caption manually; Drive not connected → the post still saves and shows "Not synced"; email fails → it's logged as *failed* with the reason. That *is* the error-handling demo.

## Likely questions → short answers

**Why Supabase and Row Level Security?**
Postgres + Auth + cron in one free managed service, and RLS puts authorisation *in the database*. Every table has RLS
enabled; policies are `user_id = auth.uid()` for both `using` and `with check`. The browser holds a public key, so even if
someone skipped our Next.js app and called the Supabase REST API directly, they'd only ever see their own rows.
`npm run test:security` proves it with two throwaway users (24 checks).

**How is a route protected?**
Three layers. `src/proxy.ts` refreshes the session cookie and redirects signed-out users. Every page, Server Action and Route
Handler calls `requireUser()` / `getCurrentUser()` from `src/lib/auth/dal.ts`, which verifies the JWT with `getClaims()`.
And RLS enforces ownership on every query.

**How does rate limiting work?**
A Postgres function `check_rate_limit(bucket, limit, window)` does an atomic `insert ... on conflict do update` on a
fixed-window counter. It's `SECURITY DEFINER` and builds the key from `auth.uid()` *inside* the database, so a user can't
pass someone else's id or reset their own counter, and the `rate_limits` table has no grants at all. Because the state is in
Postgres, the limit holds across all Vercel serverless instances (an in-memory counter wouldn't). Limits: generate 10/min,
mutations 30/min, test email 5/5 min. Over the limit → HTTP 429 with `Retry-After`. If the limiter itself errors we fail open
and log, so a DB hiccup doesn't block users.

**How are the Google Drive OAuth tokens protected?**
The refresh token lives in `drive_connections.refresh_token`. Clients only get a **column-level grant** on
`user_id, google_email, folder_id, connected_at`, so `select refresh_token` from the browser fails with *permission denied*.
Only server code with the Supabase secret key (`src/lib/supabase/admin.ts`, marked `server-only`) reads or writes it.
The OAuth flow uses a random `state` in an HTTP-only cookie (CSRF), `access_type=offline` for a refresh token, and the
narrow `drive.file` scope: Cadence can only see files it created, not the rest of the user's Drive.

**How are emails automated?**
Two paths. (1) **Immediate**: when a post is scheduled, `createPost` calls `sendScheduledConfirmation()` (Resend REST API),
respecting the user's settings and the post's notify toggle, and stamps `confirmation_sent_at`. (2) **Reminders**: Supabase
**pg_cron** runs every minute and, via `pg_net`, calls `GET /api/cron/notify` with `Authorization: Bearer CRON_SECRET`
(compared in constant time). `processDueReminders()` finds scheduled posts where
`scheduled_at - remind_before_minutes <= now()` and `reminder_sent_at is null` (a partial index makes that cheap), sends,
and stamps `reminder_sent_at` so each reminder goes out once. Every attempt is written to `notification_log` (sent / failed + error).

**Why pg_cron and not Vercel Cron?**
Vercel's free plan only runs cron once a day; reminders need minute precision. pg_cron is built into Supabase and calls our
endpoint like any external client, guarded by the shared secret.

**How do you make Gemini output reliable?**
We call `gemini-2.5-flash` with `responseMimeType: "application/json"` and a response schema (`options[] { caption, hashtags[] }`).
We then `JSON.parse` and validate with zod: option count, caption length within the platform limit (X 280, Instagram 2200...),
hashtag count and format (strip `#`, dedupe). Anything invalid is a typed `GeminiError` → 502 with a friendly message,
never raw model text. The key is server-only; the browser only talks to our `/api/generate` route.

**What happens on errors?**
Every integration degrades gracefully: missing env vars → "isn't configured" states, not crashes. Route handlers return
typed status codes (401, 400 with field errors, 429, 503 not configured, 502 upstream). Server Actions return
`ActionResult` (`ok` / `fail` + field errors) shown inline and as toasts. Drive/email failures never lose the post; they're
recorded on the row and shown as badges. `error.tsx` boundaries catch the rest.

**Where is validation?**
One zod schema per form in `src/lib/validation/`, used by the client form *and* re-run in the Server Action / route.
Postgres `CHECK` constraints are the last line (e.g. a scheduled post must have `scheduled_at`, caption 1–2200 chars,
platform in a fixed list). TypeScript strict with no `any`.

**How would this scale?**
Stateless Next.js on Vercel scales horizontally; all shared state (sessions, rate limits, schedules) is in Postgres.
Queries hit indexes (`posts(user_id, scheduled_at)`, partial index for due reminders, `notification_log(user_id, created_at)`).
The cron job processes due posts in batches, so more users means more rows per tick, not more jobs. Next steps: a queue
(e.g. Supabase Queues) for email/Drive retries, a verified Resend domain, publishing directly to platform APIs, and teams
(an `org_id` column plus RLS policies on membership).

**Why Server Actions instead of a REST API?**
Mutations from our own UI are type-safe end to end, CSRF-protected by Next.js, and can `revalidatePath` so the feed
refreshes without client cache code. We still use Route Handlers where something external calls us (OAuth callback, cron)
or where the client needs a fetch with loading/retry states (generate).

**Where are secrets?**
Only in `.env.local` (git-ignored) and Vercel env vars. Public: Supabase URL + publishable key. Server-only: Supabase secret
key, Gemini key, Google client secret, Resend key, cron secret. `.env.example` documents each with no real values.
