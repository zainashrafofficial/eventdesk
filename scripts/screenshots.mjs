#!/usr/bin/env node
/**
 * End-to-end check + README screenshots for Cadence.
 *
 * Drives the real app in your installed Chrome (or Edge) through the single-page studio:
 * route protection -> sign up -> generate captions (Gemini) -> pick one -> schedule (Drive sync +
 * confirmation email server-side) -> feed -> edit -> notification settings -> delete -> mobile -> sign out.
 * Saves numbered PNGs to docs/screenshots/ (fixed names, referenced by README.md).
 *
 * AI-dependent steps are SOFT: if Gemini isn't configured (or is rate limited) the script logs a
 * warning and skips the steps that need generated captions instead of failing. Everything else
 * throws on the first broken step. Set STRICT=1 to make AI failures fatal too.
 *
 * Usage:
 *   npm run test:e2e                                      # against http://localhost:3000
 *   BASE_URL=https://your-app.vercel.app npm run test:e2e
 *   EMAIL=you@x.com PASSWORD=secret123 npm run test:e2e   # use an existing account
 *   HEADED=1 npm run test:e2e                             # watch it run
 *
 * PowerShell:  $env:BASE_URL="https://your-app.vercel.app"; npm run test:e2e
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = path.resolve("docs/screenshots");
const stamp = Date.now().toString(36);
const EMAIL = process.env.EMAIL ?? `demo.${stamp}@example.com`;
const PASSWORD = process.env.PASSWORD ?? "Demo-pass-2026";
const NAME = "Ayesha Khan";
const HEADED = process.env.HEADED === "1";
const STRICT = process.env.STRICT === "1";
const PROMPT = "Launching our new single-origin coffee blend this weekend";
const EDITED = "Our single-origin Ethiopian blend lands this Saturday. First 50 cups are on us. (edited)";

let shots = 0;
const warnings = [];
const log = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => {
  warnings.push(msg);
  console.warn(`  ! ${msg}`);
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

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

/** Saves docs/screenshots/<name>.png. Names carry their own number so README links stay stable. */
async function shot(page, name, opts = {}) {
  shots += 1;
  const file = path.join(OUT, `${name}.png`);
  await page.waitForTimeout(350); // let transitions settle
  await page
    .waitForFunction(
      () =>
        [...document.images]
          .filter((img) => img.getBoundingClientRect().top < window.innerHeight)
          .every((img) => img.complete && img.naturalWidth > 0),
      null,
      { timeout: 10000 },
    )
    .catch(() => {});
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
  log(`screenshot ${path.basename(file)}`);
}

/** First candidate locator that becomes visible (UI copy can vary slightly between builds). */
async function firstVisible(candidates, label, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    for (const c of candidates) {
      const l = c.first();
      if (await l.isVisible().catch(() => false)) return l;
    }
    await pause(200);
  }
  throw new Error(`Could not find ${label}`);
}

/** Runs an AI-dependent step; on failure logs a warning and returns null (unless STRICT=1). */
async function soft(label, fn) {
  try {
    return await fn();
  } catch (err) {
    if (STRICT) throw err;
    warn(`${label} skipped: ${err.message}`);
    return null;
  }
}

/** Visible, non-empty alerts (excludes Next's hidden route announcer) + sonner error toasts. */
const errorAlert = (page) =>
  page
    .locator("[role=alert]:not(#__next-route-announcer__), [data-sonner-toast][data-type=error]")
    .filter({ hasText: /\S/ });

const feedScope = async (page) => {
  const region = page.getByRole("region", { name: /feed|queue|posts|scheduled/i });
  return (await region.count()) ? region.first() : page;
};

async function choosePlatform(page, value, label) {
  const select = page.locator("select").filter({ has: page.locator(`option[value="${value}"]`) });
  if (await select.count()) {
    await select.first().selectOption(value);
    return;
  }
  const choice = await firstVisible(
    [
      page.getByRole("radio", { name: label }),
      page.getByRole("tab", { name: label }),
      page.getByRole("button", { name: label }),
      page.getByLabel(label),
    ],
    `platform "${value}"`,
  );
  await choice.click();
}

/** Caption option cards rendered after generation. */
const optionCards = (page) =>
  page
    .locator("[data-caption-option]")
    .or(page.getByRole("radiogroup", { name: /caption|option/i }).getByRole("radio"))
    .or(page.getByRole("button", { name: /use this|select (this )?(caption|option)|choose (this )?(caption|option)/i }));

async function clickCardAction(page, scope, name, which = "first") {
  const direct = scope.getByRole("button", { name });
  if (await direct.count()) {
    await (which === "last" ? direct.last() : direct.first()).click();
    return;
  }
  // Fallback: an overflow "More" menu on the card.
  const more = scope.getByRole("button", { name: /more|actions|options|menu/i });
  await (which === "last" ? more.last() : more.first()).click();
  await page.getByRole("menuitem", { name }).first().click();
}

async function signOut(page) {
  const direct = page.getByRole("button", { name: /^sign out$/i });
  if (await direct.first().isVisible().catch(() => false)) {
    await direct.first().click();
    return;
  }
  const menu = await firstVisible(
    [page.getByRole("button", { name: /account|profile|user menu|open menu/i })],
    "account menu",
  );
  await menu.click();
  await page.getByRole("menuitem", { name: /sign out/i }).first().click();
}

function localDateTime(daysFromNow, hour) {
  const d = new Date(Date.now() + daysFromNow * 86400000);
  d.setHours(hour, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

async function main() {
  console.log(`\nCadence E2E against ${BASE}\n`);
  await mkdir(OUT, { recursive: true });
  const browser = await launch();
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
  await shot(page, "01-landing");

  // 2. Route protection: anonymous visit to /dashboard is redirected to /login?next=...
  await page.goto(`${BASE}/dashboard`);
  await page.waitForURL(/\/login\?next=/);
  await shot(page, "02-route-protection-redirect");
  const api = await page.request.post(`${BASE}/api/generate`, {
    data: { prompt: PROMPT, platform: "instagram", tone: "friendly", count: 3 },
  });
  if (api.status() !== 401) throw new Error(`Expected 401 from /api/generate when signed out, got ${api.status()}`);
  log("protected API /api/generate returns 401 when signed out");
  const cron = await page.request.get(`${BASE}/api/cron/notify`);
  if (cron.ok()) throw new Error(`/api/cron/notify accepted a request without CRON_SECRET (${cron.status()})`);
  log(`cron endpoint rejects requests without the secret (${cron.status()})`);

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
    await shot(page, "03-signup-validation");
    await page.fill("#full_name", NAME);
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await page.fill("#confirm", PASSWORD);
    await shot(page, "04-signup-form");
    await page.getByRole("button", { name: /create account/i }).click();
    const outcome = await Promise.race([
      page.waitForURL(/\/dashboard/, { timeout: 20000 }).then(() => "in"),
      page.getByText("Check your inbox").waitFor({ timeout: 20000 }).then(() => "confirm"),
      page
        .locator("form [role=alert], [role=alert].rounded-xl")
        .filter({ hasText: /\S/ })
        .first()
        .waitFor({ timeout: 20000 })
        .then(() => "error"),
    ]);
    if (outcome === "error") {
      const text = await page.locator("[role=alert]").filter({ hasText: /\S/ }).first().innerText();
      throw new Error(
        `Sign-up was rejected: "${text}". If it mentions the email address, Confirm email is probably ON (Supabase only accepts real addresses when it has to send mail).`,
      );
    }
    if (outcome === "confirm") {
      throw new Error(
        "Email confirmation is ON. Disable it (Supabase > Authentication > Sign In / Providers > Email > Confirm email) or rerun with EMAIL/PASSWORD of a confirmed account.",
      );
    }
  }
  await page.waitForURL(/\/dashboard/);
  const generateBtn = page.getByRole("button", { name: /generate captions/i });
  await generateBtn.waitFor();
  await shot(page, "05-studio-empty", { fullPage: true });
  log(`signed in as ${EMAIL}`);

  // 4. Generate captions with Gemini (soft: needs GEMINI_API_KEY)
  const prompt = await firstVisible(
    [page.locator("section[aria-labelledby=generator-title] textarea"), page.locator("textarea")],
    "the prompt field",
  );
  await prompt.fill(PROMPT);
  await choosePlatform(page, "instagram", /instagram/i);
  await shot(page, "06-generate-prompt");
  await generateBtn.click();

  const generated = await soft("caption generation (Gemini)", async () => {
    const outcome = await Promise.race([
      optionCards(page).first().waitFor({ timeout: 60000 }).then(() => "options"),
      errorAlert(page).first().waitFor({ timeout: 60000 }).then(() => "error"),
    ]);
    if (outcome === "error") {
      const text = (await errorAlert(page).first().innerText()).trim();
      await shot(page, "07-generation-error");
      throw new Error(`the generator showed an error: "${text}" (is GEMINI_API_KEY set?)`);
    }
    const count = await optionCards(page).count();
    await shot(page, "07-caption-options", { fullPage: true });
    log(`Gemini returned ${count} caption option(s)`);
    return count;
  });

  // 5. Pick an option, schedule it, and save a second one as a draft
  let hasPosts = false;
  if (generated) {
    await soft("selecting a caption option", async () => {
      await page.getByRole("radio", { name: /use this|selected/i }).first().click();
      await page.locator('input[type="datetime-local"]').first().waitFor({ timeout: 10000 });
    });
    const when = await firstVisible([page.locator('input[type="datetime-local"]')], "the schedule time input");
    await when.fill(localDateTime(2, 10));
    const notes = page.getByLabel(/notes|task details/i).first();
    if (await notes.isVisible().catch(() => false)) {
      await notes.fill("Shoot latte-art photo Friday. Tag @roastery partners.");
    }
    await shot(page, "08-schedule-composer");
    await page.getByRole("button", { name: /schedule post/i }).click();
    await page
      .locator("[data-sonner-toast]")
      .filter({ hasText: /scheduled|saved|created/i })
      .first()
      .waitFor({ timeout: 30000 });
    hasPosts = true;
    log("post scheduled (Drive sync + confirmation email run server-side)");

    await soft("saving a second option as a draft", async () => {
      const cards = optionCards(page);
      if ((await cards.count()) < 2) throw new Error("only one caption option left on screen");
      await cards.nth(1).click();
      await page.getByRole("button", { name: /save draft/i }).click();
      await page
        .locator("[data-sonner-toast]")
        .filter({ hasText: /draft|saved/i })
        .first()
        .waitFor({ timeout: 30000 });
      log("second caption saved as a draft");
    });

    const feedHeading = page.getByRole("heading", { name: /feed|queue|scheduled|your posts/i }).first();
    await feedHeading.scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, "09-post-feed");
  } else {
    warn("no caption options, so schedule / feed / edit / delete steps are skipped");
  }

  // 6. UPDATE: edit the caption text of the first card
  if (hasPosts) {
    const feed = await feedScope(page);
    await clickCardAction(page, feed, /^edit/i, "first");
    const dialog = page.getByRole("dialog");
    const inDialog = await dialog.isVisible().catch(() => false);
    const editor = (inDialog ? dialog : feed).locator("textarea").first();
    await editor.fill(EDITED);
    await shot(page, "10-edit-post");
    await (inDialog ? dialog : feed).getByRole("button", { name: /^save/i }).first().click();
    if (inDialog) await dialog.waitFor({ state: "hidden" });
    await page.getByText("(edited)").first().waitFor();
    log("post caption updated");
  }

  // 7. Notification settings sheet (custom email preferences)
  await page.getByRole("button", { name: /notifications/i }).first().click();
  const sheet = page.getByRole("dialog");
  await sheet.waitFor();
  await shot(page, "11-notification-settings");
  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "hidden" });
  log("notification settings sheet opens");

  // 8. DELETE via ConfirmDialog (removes the row and its Google Doc)
  if (hasPosts) {
    const feed = await feedScope(page);
    await clickCardAction(page, feed, /delete/i, "last");
    const confirm = page.getByRole("alertdialog");
    await confirm.waitFor();
    await shot(page, "12-delete-confirm");
    await confirm.getByRole("button", { name: /delete/i }).click();
    await confirm.waitFor({ state: "hidden" });
    await page
      .locator("[data-sonner-toast]")
      .filter({ hasText: /deleted|removed/i })
      .first()
      .waitFor({ timeout: 15000 })
      .catch(() => warn("no 'deleted' toast seen after confirming delete"));
    log("post deleted");
  }

  // 9. Google Drive connect endpoint is protected and wired (soft: needs Google OAuth env vars)
  await soft("Drive connect check", async () => {
    const res = await page.request.get(`${BASE}/api/drive/connect`, { maxRedirects: 0 });
    const location = res.headers()["location"] ?? "";
    if (location.includes("accounts.google.com")) log("Drive connect redirects to Google OAuth with a CSRF state");
    else throw new Error(`Drive OAuth not configured here (status ${res.status()}${location ? ` → ${location}` : ""})`);
  });

  // 10. Responsive: mobile
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    storageState: await context.storageState(),
  });
  const m = await mobile.newPage();
  m.setDefaultTimeout(20000);
  await m.goto(`${BASE}/dashboard`);
  await m.getByRole("button", { name: /generate captions/i }).waitFor();
  await shot(m, "13-mobile-studio");
  if (hasPosts) {
    await soft("mobile feed screenshot", async () => {
      await m.getByRole("heading", { name: /feed|queue|scheduled|your posts/i }).first().scrollIntoViewIfNeeded();
      await shot(m, "14-mobile-feed");
    });
  }
  await mobile.close();

  // 11. Sign out -> session gone -> protected again
  await page.goto(`${BASE}/dashboard`);
  await signOut(page);
  await page.waitForURL(/\/login/);
  await shot(page, "15-signed-out");
  await page.goto(`${BASE}/dashboard`);
  await page.waitForURL(/\/login\?next=/);
  log("sign out clears the session");

  await browser.close();
  if (warnings.length) {
    console.log(`\nPassed with ${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }
  console.log(`\nAll required pipelines passed. ${shots} screenshots in docs/screenshots/\n`);
}

main().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
