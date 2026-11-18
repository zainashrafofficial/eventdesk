# Cadence: project guide for Claude Code

@AGENTS.md

Competition project for the VSpark 2026 Web Development track. The full competition rules and the
task workflow are in `../instructions.md`. Read that first if you were started with it. The module contract the
parallel build followed is in `AGENT_CONTRACT.md` (exact exports per file).

**Product:** Cadence, an AI social media caption generator + scheduler (converted from the earlier "EventDesk" template).
Single-page studio at `/dashboard`: Gemini generates 2–3 caption options with hashtags → user picks one, edits, sets a
time + task notes → save draft / schedule → post is synced as a Google Doc to the user's Drive ("Cadence Drafts") →
confirmation email on schedule + pg_cron reminder emails → feed with edit / delete. Notification settings are per user.

## Stack (do not swap)
Next.js 16.4 App Router + Turbopack · React 19 · TypeScript strict · Supabase (Auth, Postgres, RLS, pg_cron) via `@supabase/ssr` ·
Tailwind CSS v4 (tokens in `src/app/globals.css`, loaded by the `@tailwindcss/turbopack` loader, no PostCSS) · Zod v4 ·
radix-ui · lucide-react · sonner. External APIs: **Google Gemini** (captions), **Google Drive** (OAuth 2.0, `drive.file`
scope; the "cloud storage"), **Resend** (email). `motion/react` is NOT installed: use CSS transitions.

## Modules
- DB: `supabase/migrations/20261118000002_cadence.sql`: `posts`, `notification_settings`, `notification_log`,
  `drive_connections` (refresh token hidden by column-level grants), `rate_limits` + RPC `check_rate_limit(p_bucket, p_limit,
  p_window_seconds)`. `supabase/cron.sql`: pg_cron job → `GET /api/cron/notify` every minute.
- Types: `src/types/db.ts` (PostRow, NotificationSettings, NotificationLogRow, DriveStatus, CaptionOption, Platform, PLATFORMS,
  PLATFORM_LIMITS, Tone...). Env: `src/lib/env.ts` (`publicEnv`, `serverEnv()`, `isGeminiConfigured()`, `isDriveConfigured()`,
  `isEmailConfigured()`, `isAdminConfigured()`).
- AI: `src/lib/services/gemini.ts` + `src/app/api/generate/route.ts` (401 / 400 / 429 + Retry-After / 503 / 502).
- Rate limits: `src/lib/rate-limit.ts` `rateLimit(bucket, limit, windowSeconds)` + `LIMITS` (generate 10/60s, mutate 30/60s,
  email 5/300s). Fails open on RPC error.
- Posts: `src/lib/validation/post.ts`, `src/lib/data/posts.ts` (`listPosts`, `getStudioData`), `src/lib/actions/posts.ts`
  (`createPost`, `updatePost`, `deletePost`).
- Drive: `src/lib/services/google-drive.ts`, `src/lib/actions/drive.ts`, `src/app/api/drive/{connect,callback}`.
- Email: `src/lib/services/email.ts` (`sendEmail`, `sendScheduledConfirmation`, `processDueReminders`), `src/lib/email/*`
  templates, `src/lib/actions/notifications.ts`, `src/lib/validation/notifications.ts`, `src/app/api/cron/notify`.
- UI: `src/app/dashboard/page.tsx` → `src/components/studio/studio.tsx` (generator, caption options, schedule composer,
  post feed, drive status, notification settings sheet, email activity).

## Commands
- `npm run dev` (local Supabase stack runs on ports 553xx; `.env.local` points at it)
- `npm run check` = typecheck + lint. Run after every change. Keep it at 0 errors, 0 warnings.
- `npm run build` before deploying.
- `npm run test:security` (RLS, column grants, rate limiter: 24 checks), `npm run test:e2e` (full browser walk-through + README
  screenshots; `BASE_URL=... npm run test:e2e` for production; AI steps are soft unless `STRICT=1`). Update
  `scripts/screenshots.mjs` when you change UI text or flows (it locates buttons by name: "Generate captions",
  "Schedule post", "Save draft", "Notifications", "Delete", "Sign out").
- Local DB: `npx supabase start | stop | status -o env`, `npx supabase db reset` re-applies migrations.

## Architecture rules
- **Session reads only through `src/lib/auth/dal.ts`** (`getCurrentUser`, `requireUser`). Pages call `requireUser()`; Server
  Actions and Route Handlers call `getCurrentUser()` and return `fail(...)` / 401 JSON.
- **Reads** live in `src/lib/data/*.ts` (server-only). **Writes** are Server Actions in `src/lib/actions/*.ts` returning
  `ActionResult` (`ok()` / `fail(msg, fieldErrors)`), then `revalidatePath("/dashboard")`.
- **One Zod schema per form** in `src/lib/validation/`, used by the client form AND the Server Action / route.
- Default to the **user-scoped** Supabase client (`@/lib/supabase/server` on the server, `@/lib/supabase/client` in the browser).
  RLS is the security boundary, so every new table needs RLS + policies + grants. The **admin client**
  (`@/lib/supabase/admin`, `SUPABASE_SECRET_KEY`, `server-only`) is used ONLY for Drive refresh tokens, the cron job and the
  email log. Never import it from client code; never expose the secret via `NEXT_PUBLIC_`.
- External APIs: server-side wrapper in `src/lib/services/` (`import "server-only"`, timeout, typed errors, never throws to the
  page), exposed through a protected Route Handler or Server Action, consumed by a client component with loading /
  error+retry / empty states. Every integration must **degrade gracefully** when its env vars are missing (`fail("... isn't
  configured")` or `configured: false`).
- Rate-limit every user-triggered write and every paid API call with `rateLimit(bucket, ...LIMITS.x)`.
- **Never use `any`** (no `as any`, no `: any`): use `unknown` + narrowing / zod.
- UI: reuse `src/components/ui/*` (Button, Input, NativeSelect, Textarea, Field, Card, Stat, Badge, EmptyState, Skeleton,
  ConfirmDialog, Dialog, Sheet, Menu, Tooltip, FormAlert, LocalTime). Design tokens: `bg-paper/surface/surface-2`,
  `text-ink/ink-2/muted/faint`, `border-line`, `accent`, `success/warning/danger(-soft)`, utilities `display`, `eyebrow`,
  `container-app`, `shadow-soft`, `shadow-lift`. Calm, Apple-grade look: glass surfaces, hairline borders, `rounded-3xl` cards,
  pill buttons, light + dark, responsive from 390 px.

## Next.js 16 / React 19 gotchas (already handled; keep handling them)
- Middleware is `src/proxy.ts` exporting `proxy()`. `params` and `searchParams` are **Promises**: `await` them.
- React 19 resets uncontrolled inputs after a `<form action>`; auth forms use controlled inputs for that reason.
- Grid columns that contain horizontal scrollers need `min-w-0`, or they blow out the layout.
- `datetime-local` values depend on the viewer's time zone: fill them in `useEffect`, convert with `new Date(v).toISOString()`.
- `NEXT_PUBLIC_*` env vars are inlined at build time: redeploy on Vercel after changing them.
- Playwright: `getByText` can also match Next's hidden route announcer (`#__next-route-announcer__`, `role=alert`); prefer
  `getByRole("heading", ...)` and exclude the announcer when waiting for alerts.

## Integration gotchas
- Google OAuth redirect URI is `${NEXT_PUBLIC_SITE_URL}/api/drive/callback`; it must be listed exactly in the Google Cloud
  OAuth client, and while the consent screen is in *Testing* only listed test users can connect. `prompt=consent` +
  `access_type=offline` are required to get a refresh token on every connect.
- Resend test mode (no verified domain) only delivers to the Resend account's own email address.
- pg_cron runs in Supabase's cloud and can only reach a public URL; locally trigger reminders with
  `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/notify`.
- Changing reminder logic: `updatePost` must reset `reminder_sent_at` when `scheduled_at` changes, or no new reminder is sent.
- A `scheduled` post must have `scheduled_at` (DB CHECK constraint `posts_scheduled_needs_time`).

## Changing the product (checklist)
1. `supabase/migrations/`: add a NEW migration file (don't edit applied ones) with table, CHECK constraints, RLS policies,
   grants, trigger; or, if nothing is deployed yet, edit and `npx supabase db reset`.
2. `src/types/db.ts`: row + vocabulary types (must match the CHECK constraints).
3. `src/lib/validation/*.ts`: form schemas.
4. `src/lib/data/*.ts` and `src/lib/actions/*.ts`: column lists, queries, actions (+ rate limits).
5. `src/components/studio/*`: UI.
6. Branding: `src/config/site.ts`, `package.json` name, landing page copy in `src/app/(marketing)/page.tsx`, auth aside copy,
   email templates in `src/lib/email/`.
7. New external API: service in `src/lib/services/` + route in `src/app/api/`. Key in a non-`NEXT_PUBLIC_` env var, read only
   via `serverEnv()`, add an `is*Configured()` helper, and document it in `.env.example` + README.
8. `scripts/screenshots.mjs` + `scripts/security-check.mjs` + `README.md` + `docs/DEFENSE.md`: update names, flows, tables.
9. `npm run check && npm run build && npm run test:security && npm run test:e2e`.
