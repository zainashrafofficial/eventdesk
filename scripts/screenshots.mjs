#!/usr/bin/env node
/**
 * End-to-end check + README screenshots.
 *
 * Drives the real app in your installed Chrome (or Edge) and walks every pipeline:
 * auth -> create (with cover upload + live geocoding) -> read (weather + map) ->
 * file upload -> list/search -> update -> delete -> sign out -> route protection.
 * It throws on the first broken step and saves numbered PNGs to docs/screenshots/.
 *
 * Usage:
 *   npm run screenshots                                   # against http://localhost:3000
 *   BASE_URL=https://your-app.vercel.app npm run screenshots
 *   EMAIL=you@x.com PASSWORD=secret123 npm run screenshots   # use an existing account
 *
 * PowerShell:  $env:BASE_URL="https://your-app.vercel.app"; npm run screenshots
 */
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = path.resolve("docs/screenshots");
const stamp = Date.now().toString(36);
const EMAIL = process.env.EMAIL ?? `demo.${stamp}@example.com`;
const PASSWORD = process.env.PASSWORD ?? "Demo-pass-2026";
const NAME = "Ayesha Khan";
const HEADED = process.env.HEADED === "1";

let step = 0;
const log = (msg) => console.log(`  ✓ ${msg}`);

async function launch() {
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel, headless: !HEADED });
    } catch {
      // try the next installed browser
    }
  }
  throw new Error("No Chrome or Edge found. Install Google Chrome, or run `npx playwright install chromium`.");
}

async function shot(page, name, opts = {}) {
  step += 1;
  const file = path.join(OUT, `${String(step).padStart(2, "0")}-${name}.png`);
  await page.waitForTimeout(350); // let transitions settle
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
  log(`screenshot ${path.basename(file)}`);
}

/** Generate sample upload files on the fly (cover PNG + agenda PDF). */
async function makeSampleFiles(browser) {
  const dir = path.join(tmpdir(), `eventdesk-${stamp}`);
  await mkdir(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.setContent(`<body style="margin:0;height:100vh;background:linear-gradient(135deg,#2b44ff,#141312 60%,#c8553d);display:grid;place-items:center;font:600 120px Georgia;color:#fff">Founders Meetup</body>`);
  const cover = path.join(dir, "founders-meetup-cover.png");
  await writeFile(cover, await page.screenshot());
  const cover2 = path.join(dir, "workshop-cover.png");
  await page.setContent(`<body style="margin:0;height:100vh;background:linear-gradient(135deg,#1e7a4c,#f1e07a);display:grid;place-items:center;font:600 120px Georgia;color:#fff">Design Workshop</body>`);
  await writeFile(cover2, await page.screenshot());
  await page.setContent(`<h1 style="font-family:Georgia">Founders Meetup: Agenda</h1><ol style="font:18px sans-serif"><li>6:00 PM Welcome</li><li>6:30 PM Lightning talks</li><li>7:30 PM Networking</li></ol>`);
  const pdf = path.join(dir, "agenda.pdf");
  await writeFile(pdf, await page.pdf({ format: "A4" }));
  await page.close();
  return { cover, cover2, pdf };
}

async function pickLocation(page, query) {
  await page.fill("#location", query);
  const option = page.locator("#location-results").getByRole("option").first();
  await option.waitFor({ timeout: 15000 });
  await option.click();
  await page.getByText(/^-?\d+\.\d{4}, -?\d+\.\d{4}$/).waitFor();
}

async function createEvent(page, { title, description, category, status, daysFromNow, location, capacity, cover }) {
  await page.goto(`${BASE}/dashboard/events/new`);
  await page.fill("#title", title);
  if (description) await page.fill("#description", description);
  await page.selectOption("#category", category);
  await page.selectOption("#status", status);
  const d = new Date(Date.now() + daysFromNow * 86400000);
  d.setHours(18, 0, 0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await page.fill("#starts_at", local);
  if (capacity) await page.fill("#capacity", String(capacity));
  if (location) await pickLocation(page, location);
  if (cover) await page.setInputFiles("#cover", cover);
}

async function main() {
  console.log(`\nEventDesk E2E against ${BASE}\n`);
  await mkdir(OUT, { recursive: true });
  const browser = await launch();
  const files = await makeSampleFiles(browser);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  // 0. Health check
  const health = await page.request.get(`${BASE}/api/health`);
  if (!health.ok()) throw new Error(`/api/health returned ${health.status()}`);
  const h = await health.json();
  if (!h.supabaseConfigured) throw new Error("Supabase env vars are missing on this deployment.");
  log("health check ok");

  // 1. Landing
  await page.goto(BASE);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.waitForTimeout(1200); // let the hero fade-in finish
  await shot(page, "landing");

  // 2. Route protection: anonymous visit to /dashboard is redirected to /login?next=...
  await page.goto(`${BASE}/dashboard/events`);
  await page.waitForURL(/\/login\?next=/);
  await shot(page, "route-protection-redirect");
  const api = await page.request.get(`${BASE}/api/weather?lat=31.5&lon=74.3`);
  if (api.status() !== 401) throw new Error(`Expected 401 from protected API, got ${api.status()}`);
  log("protected API returns 401 when signed out");

  // 3. Auth
  if (process.env.EMAIL) {
    await page.goto(`${BASE}/login`);
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
  } else {
    await page.goto(`${BASE}/signup`);
    await page.getByRole("button", { name: /create account/i }).click();
    await page.getByText("Tell us your name.").waitFor();
    await shot(page, "signup-validation");
    await page.fill("#full_name", NAME);
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await page.fill("#confirm", PASSWORD);
    await shot(page, "signup-form");
    await page.getByRole("button", { name: /create account/i }).click();
    const outcome = await Promise.race([
      page.waitForURL(/\/dashboard/, { timeout: 20000 }).then(() => "in"),
      page.getByText("Check your inbox").waitFor({ timeout: 20000 }).then(() => "confirm"),
    ]);
    if (outcome === "confirm") {
      throw new Error(
        "Email confirmation is ON. Disable it (Supabase > Authentication > Sign In / Providers > Email > Confirm email) or rerun with EMAIL/PASSWORD of a confirmed account.",
      );
    }
  }
  await page.waitForURL(/\/dashboard/);
  await page.getByRole("heading", { name: /Hello,/ }).waitFor();
  await shot(page, "dashboard-empty");
  log(`signed in as ${EMAIL}`);

  // 4. CREATE with live geocoding + cover upload
  await createEvent(page, {
    title: "Founders Meetup",
    description: "An evening of lightning talks and networking for early-stage founders.\nBring business cards!",
    category: "meetup",
    status: "confirmed",
    daysFromNow: 3,
    location: "Lahore",
    capacity: 80,
    cover: files.cover,
  });
  await shot(page, "create-event-form", { fullPage: true });
  await page.getByRole("button", { name: /create event/i }).click();
  await page.waitForURL(/\/dashboard\/events\/[0-9a-f-]{36}$/);
  const eventUrl = page.url();
  log("event created");

  // 5. READ: detail page with weather API + map
  await page.getByText("Event day ·").waitFor({ timeout: 20000 });
  await page.getByRole("heading", { name: "Venue map" }).waitFor();
  await shot(page, "event-detail-weather-map", { fullPage: true });
  log("weather API rendered for event day");

  // 6. Cloud storage: upload attachments (PDF + image) and render them
  await page.setInputFiles("#attachments-input", [files.pdf, files.cover2]);
  await page.getByText("agenda.pdf").waitFor({ timeout: 20000 });
  await page.getByRole("img", { name: "workshop-cover.png" }).waitFor({ timeout: 20000 });
  await page.getByText("Files (2)").waitFor();
  const files$ = page.locator("section[aria-labelledby=files-title]");
  await files$.scrollIntoViewIfNeeded();
  await shot(page, "file-uploads");
  const pdfHref = await page.getByRole("link", { name: "Open agenda.pdf" }).getAttribute("href");
  const pdfRes = await page.request.get(pdfHref);
  if (!pdfRes.ok() || !(pdfRes.headers()["content-type"] ?? "").includes("pdf")) {
    throw new Error("Signed URL for the PDF did not return the file.");
  }
  log("files uploaded and retrievable through signed URLs");

  // More events for the list
  await createEvent(page, { title: "Design Systems Workshop", category: "workshop", status: "planned", daysFromNow: 9, location: "Islamabad", capacity: 25, cover: files.cover2 });
  await page.getByRole("button", { name: /create event/i }).click();
  await page.waitForURL(/\/dashboard\/events\/[0-9a-f-]{36}$/);
  await createEvent(page, { title: "Campus Cricket Final", category: "sports", status: "completed", daysFromNow: -12, location: "Multan" });
  await page.getByRole("button", { name: /create event/i }).click();
  await page.waitForURL(/\/dashboard\/events\/[0-9a-f-]{36}$/);
  await createEvent(page, { title: "Annual Tech Conference", category: "conference", status: "planned", daysFromNow: 40, location: "Karachi", capacity: 600 });
  await page.getByRole("button", { name: /create event/i }).click();
  await page.waitForURL(/\/dashboard\/events\/[0-9a-f-]{36}$/);

  // 7. Server-side validation surfaced on the client (empty title)
  await page.goto(`${BASE}/dashboard/events/new`);
  await page.getByRole("button", { name: /create event/i }).click();
  await page.getByText("Give the event a title of at least 3 characters.").waitFor();
  await shot(page, "form-validation");

  // 8. List + search/filter
  await page.goto(`${BASE}/dashboard/events`);
  await page.getByText("Founders Meetup").first().waitFor();
  await shot(page, "events-list");
  await page.getByLabel("Search events").fill("workshop");
  await page.waitForURL(/q=workshop/);
  await page.getByText("1 event match your filters.").waitFor();
  await shot(page, "events-search");
  log("list, search and filters work");

  // 9. UPDATE
  await page.goto(`${eventUrl}/edit`);
  await page.waitForFunction(() => document.querySelector("#starts_at")?.value);
  await page.fill("#title", "Founders Meetup 2026");
  await page.selectOption("#status", "planned");
  await shot(page, "edit-event");
  await page.getByRole("button", { name: /save changes/i }).click();
  await page.waitForURL(eventUrl);
  await page.getByRole("heading", { name: "Founders Meetup 2026" }).waitFor();
  log("event updated");

  // 10. DELETE (confirm dialog)
  await page.goto(`${BASE}/dashboard/events?q=conference`);
  await page.getByText("Annual Tech Conference").click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").waitFor();
  await shot(page, "delete-confirm");
  await page.getByRole("button", { name: "Delete event" }).click();
  await page.waitForURL(/\/dashboard\/events$/);
  await page.getByText("Annual Tech Conference").waitFor({ state: "detached" });
  log("event deleted");

  // 11. Dashboard with data
  await page.goto(`${BASE}/dashboard`);
  await page.getByText("Next up").waitFor();
  await page.getByText(/Event day ·|beyond the 16-day/).waitFor({ timeout: 20000 });
  await shot(page, "dashboard", { fullPage: true });

  // 12. Responsive: mobile
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    storageState: await context.storageState(),
  });
  const m = await mobile.newPage();
  await m.goto(`${BASE}/dashboard/events`);
  await m.getByText("Founders Meetup 2026").waitFor();
  await shot(m, "mobile-events");
  await m.getByRole("button", { name: "Open navigation" }).click();
  await m.getByRole("dialog").waitFor();
  await shot(m, "mobile-nav");
  await mobile.close();

  // 13. Sign out -> session gone -> protected again
  await page.goto(`${BASE}/dashboard`);
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await page.waitForURL(/\/login\?signedOut=1/);
  await shot(page, "signed-out");
  await page.goto(`${BASE}/dashboard`);
  await page.waitForURL(/\/login\?next=/);
  log("sign out clears the session");

  await browser.close();
  console.log(`\nAll pipelines passed. ${step} screenshots in docs/screenshots/\n`);
}

main().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
