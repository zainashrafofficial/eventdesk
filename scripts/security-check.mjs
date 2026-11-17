#!/usr/bin/env node
/**
 * Security check: proves Row Level Security isolates users at the DATABASE level,
 * even when someone bypasses the Next.js app and calls Supabase directly with the public key.
 *
 *   npm run test:security        (reads NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY from .env.local)
 *
 * Needs "Confirm email" disabled so the throwaway users can sign in immediately.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
  const { data, error } = await client.auth.signUp({ email: `rls.${name}.${stamp}@example.com`, password: "Rls-check-2026" });
  if (error) throw new Error(`sign up ${name}: ${error.message}`);
  if (!data.session) throw new Error("Email confirmation is on; disable it to run this check.");
  return { client, id: data.user.id };
}

console.log(`\nRLS security check against ${url}\n`);

const anon = createClient(url, key, opts);
const a = await newUser("alice");
const b = await newUser("bob");

// Alice creates an event and uploads a file.
const { data: ev, error: evErr } = await a.client
  .from("events")
  .insert({ title: "Alice private event", category: "meetup", status: "planned", starts_at: new Date().toISOString() })
  .select("id")
  .single();
check(!evErr && ev?.id, "owner can create an event");
const filePath = `${a.id}/${ev.id}/secret.txt`;
const { error: upErr } = await a.client.storage
  .from("event-files")
  .upload(filePath, new Blob(["top secret"], { type: "text/plain" }), { contentType: "text/plain" });
check(!upErr, "owner can upload to their own folder");

// Anonymous visitor
const anonRead = await anon.from("events").select("id").eq("id", ev.id);
check(!anonRead.data?.length, "anonymous visitor cannot read events");

// Bob tries everything against Alice's data.
const bobRead = await b.client.from("events").select("id").eq("id", ev.id);
check((bobRead.data ?? []).length === 0, "other user cannot READ the event");

const bobUpdate = await b.client.from("events").update({ title: "hacked" }).eq("id", ev.id).select("id");
check((bobUpdate.data ?? []).length === 0, "other user cannot UPDATE the event");

const bobDelete = await b.client.from("events").delete().eq("id", ev.id).select("id");
check((bobDelete.data ?? []).length === 0, "other user cannot DELETE the event");

const bobSpoof = await b.client
  .from("events")
  .insert({ user_id: a.id, title: "Spoofed owner", category: "other", status: "planned", starts_at: new Date().toISOString() });
check(Boolean(bobSpoof.error), "other user cannot INSERT rows owned by someone else");

const bobAttach = await b.client
  .from("attachments")
  .insert({ event_id: ev.id, file_path: `${b.id}/${ev.id}/x.txt`, file_name: "x.txt", mime_type: "text/plain", size_bytes: 1 });
check(Boolean(bobAttach.error), "other user cannot attach files to someone else's event");

const bobDownload = await b.client.storage.from("event-files").download(filePath);
check(Boolean(bobDownload.error), "other user cannot DOWNLOAD the owner's file");

const bobSign = await b.client.storage.from("event-files").createSignedUrl(filePath, 60);
check(Boolean(bobSign.error), "other user cannot create a signed URL for the owner's file");

const bobUpload = await b.client.storage
  .from("event-files")
  .upload(`${a.id}/${ev.id}/evil.txt`, new Blob(["x"], { type: "text/plain" }), { contentType: "text/plain" });
check(Boolean(bobUpload.error), "other user cannot UPLOAD into the owner's folder");

const badType = await a.client.storage
  .from("event-files")
  .upload(`${a.id}/${ev.id}/script.html`, new Blob(["<script>"], { type: "text/html" }), { contentType: "text/html" });
check(Boolean(badType.error), "bucket rejects disallowed file types (text/html)");

// Owner still has full access, then cleans up.
const ownerRead = await a.client.from("events").select("title").eq("id", ev.id).single();
check(ownerRead.data?.title === "Alice private event", "owner's data is intact");
await a.client.storage.from("event-files").remove([filePath]);
await a.client.from("events").delete().eq("id", ev.id);

console.log(failures ? `\n${failures} check(s) FAILED\n` : "\nAll security checks passed.\n");
process.exit(failures ? 1 : 0);
