# EventDesk: project guide for Claude Code

@AGENTS.md

Competition project for the VSpark 2026 Web Development track. The full competition rules and the
task workflow are in `../instructions.md`. Read that first if you were started with it.

## Stack (do not swap)
Next.js 16.4 App Router + Turbopack · React 19 · TypeScript strict · Supabase (Auth, Postgres, Storage) via `@supabase/ssr` ·
Tailwind CSS v4 (tokens in `src/app/globals.css`, loaded by the `@tailwindcss/turbopack` loader, no PostCSS) · Zod v4 ·
radix-ui · lucide-react · sonner. External API: Open-Meteo (no key) + OpenStreetMap iframe.

## Commands
- `npm run dev` (local Supabase stack runs on ports 553xx; `.env.local` points at it)
- `npm run check` = typecheck + lint. Run after every change. Keep it at 0 errors, 0 warnings.
- `npm run build` before deploying.
- `npm run test:security` (RLS isolation, 13 checks), `npm run test:e2e` (full browser walk-through + README screenshots;
  `BASE_URL=... npm run test:e2e` for production). Update `scripts/screenshots.mjs` when you change UI text or flows.
- Local DB: `npx supabase start | stop | status -o env`, `npx supabase db reset` re-applies migrations.

## Architecture rules
- **Session reads only through `src/lib/auth/dal.ts`** (`getCurrentUser`, `requireUser`). Pages call `requireUser()`; Server
  Actions and Route Handlers call `getCurrentUser()` and return `fail(...)` / 401 JSON.
- **Reads** live in `src/lib/data/*.ts` (server-only). **Writes** are Server Actions in `src/lib/actions/*.ts` returning
  `ActionResult` (`ok()` / `fail(msg, fieldErrors)`), then `revalidatePath(...)`.
- **One Zod schema per form** in `src/lib/validation/`, used by the client form AND the Server Action.
- Always use the **user-scoped** Supabase client (`@/lib/supabase/server` on the server, `@/lib/supabase/client` in the browser).
  There is intentionally no service-role key. RLS is the security boundary, so every new table needs RLS + policies + grants.
- Files: browser uploads directly to the private `event-files` bucket at `{user_id}/...`, then a Server Action records metadata.
  Render via signed URLs (`createSignedUrls`). Constants/validators in `src/lib/storage.ts`.
- External APIs: server-side wrapper in `src/lib/services/` (timeout, one retry, typed `ExternalApiError`), exposed through a
  protected Route Handler in `src/app/api/`, consumed by a client component with loading / error+retry / empty states.
- UI: reuse `src/components/ui/*` (Button, Input, NativeSelect, Textarea, Field, Card, Stat, Badge, EmptyState, Skeleton,
  ConfirmDialog, Dialog, Sheet, Menu, PageHeader, FormAlert, LocalTime). Design tokens: `bg-paper/surface/surface-2`,
  `text-ink/ink-2/muted/faint`, `accent`, `success/warning/danger(-soft)`, utilities `display`, `serif`, `eyebrow`, `container-app`.

## Next.js 16 / React 19 gotchas (already handled; keep handling them)
- Middleware is `src/proxy.ts` exporting `proxy()`. `params` and `searchParams` are **Promises**: `await` them.
- React 19 resets uncontrolled inputs after a `<form action>`; auth forms use controlled inputs for that reason.
- Grid columns that contain horizontal scrollers need `min-w-0`, or they blow out the layout.
- `datetime-local` values depend on the viewer's time zone: fill them in `useEffect`, convert with `new Date(v).toISOString()`.
- Signed URLs expire, so use `<img>` (with the eslint disable comment), not `next/image`, for storage files.
- `NEXT_PUBLIC_*` env vars are inlined at build time: redeploy on Vercel after changing them.
- Playwright: `getByText` can also match Next's hidden route announcer; prefer `getByRole("heading", ...)`.

## Re-skinning for a new task brief (checklist)
The main resource is "events". To turn it into the brief's entity (e.g. "listings", "jobs", "patients", "books"):
1. `supabase/migrations/`: add a NEW migration file (don't edit the applied one) creating the new table, CHECK constraints,
   RLS policies, grants, trigger; or, if nothing is deployed yet, edit `20261118000001_init.sql` and run `npx supabase db reset`.
2. `src/config/events.ts`: categories / statuses / sort options vocabulary (must match the CHECK constraints).
3. `src/types/db.ts`: row types.
4. `src/lib/validation/event.ts`: form schema + list filters.
5. `src/lib/data/events.ts` and `src/lib/actions/events.ts`: column lists, queries, actions.
6. `src/components/events/*`: form fields, card, detail sections.
7. `src/app/dashboard/**`: page titles, routes (`/dashboard/events` → `/dashboard/<entity>`), plus `src/config/site.ts` nav
   and `PROTECTED_PREFIXES` in `src/lib/supabase/proxy.ts` if you add top-level protected routes.
8. Branding: `src/config/site.ts`, `package.json` name, landing page copy in `src/app/(marketing)/page.tsx`, auth aside copy.
9. External API: if the brief names a different API, add a service in `src/lib/services/` + route in `src/app/api/` following
   `open-meteo.ts` / `api/weather/route.ts`. Put any API key in a non-`NEXT_PUBLIC_` env var, read only on the server, and add
   it to `.env.example` + README.
10. `scripts/screenshots.mjs` + `scripts/security-check.mjs` + `README.md`: update names, flows, table names.
11. `npm run check && npm run build && npm run test:security && npm run test:e2e`.
