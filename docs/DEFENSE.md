# Live demo & technical defense: cheat sheet

## 3-minute demo (in rubric order)

1. **Live URL** (Deployment, 15): open the Vercel URL. Show `/api/health` returns `"status":"ok"`.
2. **Auth** (15): open `/dashboard` signed out → redirected to `/login?next=/dashboard`. Sign up with a bad password to show
   validation, then a good one → lands on dashboard. Mention the 3 protection layers.
3. **Create** (CRUD, 20): New event → type "Lah" in Venue → pick Lahore from live results (**external API #1**) → upload a
   cover image (**storage**) → Create.
4. **Read**: detail page shows the cover from the private bucket, **weather for event day** (**external API #2**), and the map.
5. **Storage** (10): drag a PDF + image into Files → they appear; click download (signed URL); delete one.
6. **List / search / filter**: Events page → search "meet", filter status, sort.
7. **Update**: Edit → change title/status → Save.
8. **Delete**: Delete → confirmation dialog → gone (files removed from storage too).
9. **Responsive** (10): DevTools device toolbar, iPhone width → hamburger menu.
10. **Sign out** → back to login; `/dashboard` is protected again.
11. Show the **README** on GitHub (screenshots, env table) and the commit history.

## Likely questions → short answers

**How is a route protected?**
Three layers. `src/proxy.ts` (Next.js 16's middleware) checks the session cookie and redirects. Every page/action/API calls
`requireUser()` or `getCurrentUser()` from `src/lib/auth/dal.ts`, which verifies the JWT with `getClaims()`. And Postgres
Row Level Security only returns rows where `user_id = auth.uid()`, so even a direct API call can't read someone else's data.

**Where is the session stored?** In HTTP-only cookies set by `@supabase/ssr`. The proxy refreshes the access token on each request.

**How does sign-out work?** `signOut` Server Action calls `supabase.auth.signOut()` (clears cookies, revokes refresh token), then redirects to `/login`.

**Show me the CRUD queries.** Reads: `src/lib/data/events.ts` (`listEvents` with `ilike` search, `eq` filters, `order`, `range`
pagination and `count: "exact"`). Writes: `src/lib/actions/events.ts` (`insert`, `update`, `delete`), each re-validated with Zod.

**Where is validation?** Same Zod schema (`src/lib/validation/event.ts`) on the client before submit and in the Server Action;
then DB `CHECK` constraints (title length, enum values, lat/lng range, capacity range, lat/lng must be a pair).

**Why Server Actions instead of REST endpoints?** They run on the server, get type-safe inputs, and Next.js handles the POST
and CSRF protection (origin check). We still use Route Handlers for the external API so the browser can fetch with loading states.

**How do uploads work securely?** The browser uploads straight to a **private** bucket at `{user_id}/...`. Storage policies
only allow writing into your own folder; the bucket limits size (10 MB) and MIME types. A Server Action re-checks the path
and records metadata. Files are shown through signed URLs that expire in 1 hour. Why direct upload? Vercel functions cap request bodies at 4.5 MB.

**What if the weather API fails?** `src/lib/services/open-meteo.ts`: 8-second timeout, one retry on network/5xx, typed
`ExternalApiError` mapped to 502/504/429 JSON. The UI shows a "Forecast unavailable" card with **Try again**. Responses are cached (15 min).

**Why call the API through your server?** Keeps it behind auth, lets us cache, normalise the data, and hide keys if we ever use a paid API.

**Database design?** `events` (owner `user_id`, indexed with `starts_at`) and `attachments` (FK to event, `on delete cascade`).
`updated_at` maintained by a trigger. Storage keys are stored, not URLs, because signed URLs expire.

**How do you prove isolation?** `npm run test:security` creates two users and shows user B can't read, update, delete, spoof,
download, sign or upload into user A's data (13 checks).

**Where are secrets?** None in Git: `.env*` is ignored except `.env.example`. Only the public Supabase key is used; RLS makes that safe. There's no service-role key in the app.

**Scalability?** Pagination with `range()`, count queries instead of loading all rows, an index on `(user_id, starts_at)`,
cached external API responses, files served from Supabase's CDN, stateless serverless functions on Vercel.

**What would you add next?** Sharing events with other users (a members table + RLS), email reminders (cron), image resizing, and tests in CI.
