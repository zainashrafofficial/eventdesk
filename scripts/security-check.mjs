#!/usr/bin/env node
/**
 * Security check: proves Row Level Security, column-level grants and the rate limiter
 * protect Cadence at the DATABASE level, even when someone bypasses the Next.js app and
 * calls Supabase directly with the public (publishable) key.
 *
 *   npm run test:security        (reads NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY from .env.local)
 *
 * Needs "Confirm email" disabled so the throwaway users can sign in immediately.
 * If SUPABASE_SECRET_KEY is set, the two throwaway users are deleted at the end (cascades their rows).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (e.g. in .env.local).");
  process.exit(1);
}

const stamp = Date.now().toString(36);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
let failures = 0;
const check = (ok, label) => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
};

async function newUser(name) {
  const client = createClient(url, key, opts);
  const email = `rls.${name}.${stamp}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "Rls-check-2026" });
  if (error) throw new Error(`sign up ${name}: ${error.message}`);
  if (!data.session) throw new Error("Email confirmation is on; disable it to run this check.");
  return { client, id: data.user.id, email };
}

console.log(`\nCadence security check against ${url}\n`);

const anon = createClient(url, key, opts);
const a = await newUser("alice");
const b = await newUser("bob");
const inOneHour = new Date(Date.now() + 3600_000).toISOString();

// ── posts ─────────────────────────────────────────────────────────────────────
console.log("posts");
const { data: post, error: postErr } = await a.client
  .from("posts")
  .insert({
    caption: "Alice's private launch caption",
    hashtags: ["coffee", "launch"],
    platform: "instagram",
    status: "scheduled",
    scheduled_at: inOneHour,
  })
  .select("id, user_id")
  .single();
check(!postErr && post?.id && post.user_id === a.id, "owner can create a post (user_id defaults to auth.uid())");
if (!post?.id) {
  console.error(`\n  Cannot continue without a post: ${postErr?.message ?? "unknown error"}\n`);
  process.exit(1);
}

const anonRead = await anon.from("posts").select("id").eq("id", post.id);
check(!anonRead.data?.length, "anonymous visitor cannot read posts");

const bobRead = await b.client.from("posts").select("id").eq("id", post.id);
check((bobRead.data ?? []).length === 0, "other user cannot READ the post");

const bobUpdate = await b.client.from("posts").update({ caption: "hacked" }).eq("id", post.id).select("id");
check((bobUpdate.data ?? []).length === 0, "other user cannot UPDATE the post");

const bobDelete = await b.client.from("posts").delete().eq("id", post.id).select("id");
check((bobDelete.data ?? []).length === 0, "other user cannot DELETE the post");

const bobSpoof = await b.client
  .from("posts")
  .insert({ user_id: a.id, caption: "Spoofed owner", platform: "x", status: "draft" });
check(Boolean(bobSpoof.error), "other user cannot INSERT a post owned by someone else");

const badRow = await a.client.from("posts").insert({ caption: "No time", platform: "instagram", status: "scheduled" });
check(Boolean(badRow.error), "CHECK constraint: a scheduled post must have scheduled_at");

// ── notification_settings + notification_log ────────────────────────────────
console.log("notifications");
const { error: setErr } = await a.client
  .from("notification_settings")
  .insert({ email: a.email, remind_before_minutes: 30, subject_prefix: "Alice" });
check(!setErr, "owner can save notification settings");

const bobSettings = await b.client.from("notification_settings").select("email").eq("user_id", a.id);
check((bobSettings.data ?? []).length === 0, "other user cannot READ someone else's notification settings");

const bobSettingsUpdate = await b.client
  .from("notification_settings")
  .update({ email: "attacker@example.com" })
  .eq("user_id", a.id)
  .select("user_id");
check((bobSettingsUpdate.data ?? []).length === 0, "other user cannot UPDATE someone else's notification settings");

const bobLog = await b.client.from("notification_log").select("id").eq("user_id", a.id);
check((bobLog.data ?? []).length === 0, "other user cannot READ someone else's notification log");

const fakeLog = await a.client
  .from("notification_log")
  .insert({ user_id: a.id, kind: "test", sent_to: a.email, status: "sent" });
check(Boolean(fakeLog.error), "clients cannot forge notification_log rows (server-only writes)");

// ── drive_connections (refresh tokens) ──────────────────────────────────────
console.log("drive_connections");
const tokenRead = await a.client.from("drive_connections").select("refresh_token");
check(Boolean(tokenRead.error), "user cannot SELECT refresh_token (column-level grant)");

const starRead = await a.client.from("drive_connections").select("*");
check(Boolean(starRead.error), "user cannot SELECT * from drive_connections (would include the token)");

const safeRead = await a.client.from("drive_connections").select("user_id, google_email, connected_at");
check(!safeRead.error, "user CAN read the non-secret Drive status columns");

const tokenInsert = await a.client
  .from("drive_connections")
  .insert({ user_id: a.id, refresh_token: "forged-token" });
check(Boolean(tokenInsert.error), "user cannot INSERT a Drive token directly (server-only writes)");

// ── rate limiting ─────────────────────────────────────────────────────────────
console.log("rate limiting");
const rlRead = await a.client.from("rate_limits").select("*");
check(Boolean(rlRead.error) || (rlRead.data ?? []).length === 0, "user cannot read the rate_limits table");

const rlWrite = await a.client.from("rate_limits").insert({ key: `test:${b.id}`, hits: 999 });
check(Boolean(rlWrite.error), "user cannot write the rate_limits table (no quota tampering)");

const hit = async () => {
  const { data, error } = await a.client.rpc("check_rate_limit", { p_bucket: "test", p_limit: 2, p_window_seconds: 60 });
  if (error) return { error };
  const row = Array.isArray(data) ? data[0] : data;
  return { allowed: row?.allowed, remaining: row?.remaining };
};
const r1 = await hit();
const r2 = await hit();
const r3 = await hit();
check(r1.allowed === true && r2.allowed === true, "check_rate_limit: first two calls in the window are allowed");
check(r3.allowed === false && r3.remaining === 0, "check_rate_limit: third call is rejected (limit 2 / 60s)");

const bobHit = await b.client.rpc("check_rate_limit", { p_bucket: "test", p_limit: 2, p_window_seconds: 60 });
const bobRow = Array.isArray(bobHit.data) ? bobHit.data[0] : bobHit.data;
check(!bobHit.error && bobRow?.allowed === true, "quotas are per user: Alice's usage doesn't block Bob");

const anonHit = await anon.rpc("check_rate_limit", { p_bucket: "test", p_limit: 2, p_window_seconds: 60 });
check(Boolean(anonHit.error), "anonymous visitor cannot call check_rate_limit");

// ── owner still has full access, then cleans up ──────────────────────────────
console.log("cleanup");
const ownerRead = await a.client.from("posts").select("caption").eq("id", post.id).single();
check(ownerRead.data?.caption === "Alice's private launch caption", "owner's post is intact after the attacks");

const ownerDelete = await a.client.from("posts").delete().eq("id", post.id).select("id");
check((ownerDelete.data ?? []).length === 1, "owner can DELETE their own post");

if (secret) {
  const admin = createClient(url, secret, opts);
  for (const u of [a, b]) await admin.auth.admin.deleteUser(u.id).catch(() => {});
  console.log("  · throwaway users deleted (cascade)");
} else {
  console.log("  · SUPABASE_SECRET_KEY not set: throwaway users rls.*@example.com were left in Auth");
}

console.log(failures ? `\n${failures} check(s) FAILED\n` : "\nAll security checks passed.\n");
process.exit(failures ? 1 : 0);
