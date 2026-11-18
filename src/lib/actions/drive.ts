"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/actions/types";
import { isAdminConfigured, isDriveConfigured } from "@/lib/env";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { revokeDriveAccess, syncPostToDrive } from "@/lib/services/google-drive";
import { createClient } from "@/lib/supabase/server";
import type { PostRow } from "@/types/db";

const SIGNED_OUT = "Your session has expired. Please sign in again.";
const NOT_CONFIGURED = "Google Drive isn't configured on this server";
const MAX_BULK_SYNC = 25;
/** The posts.updated_at trigger fires when we write drive_synced_at, so allow a little slack. */
const SYNC_SLACK_MS = 10_000;

const postIdSchema = z.uuid({ message: "Invalid post id" });

export async function disconnectDrive(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail(SIGNED_OUT);

  // Revoke at Google first (needs the token, which only the admin client can read), then drop the row.
  await revokeDriveAccess(user.id);

  const supabase = await createClient();
  const { error } = await supabase.from("drive_connections").delete().eq("user_id", user.id);
  if (error) return fail("Couldn't disconnect Google Drive. Please try again.");

  revalidatePath("/dashboard");
  return ok(undefined, "Google Drive disconnected");
}

export async function syncPostNow(postId: string): Promise<ActionResult<{ fileId: string }>> {
  const parsedId = postIdSchema.safeParse(postId);
  if (!parsedId.success) return fail("Invalid post id");

  const user = await getCurrentUser();
  if (!user) return fail(SIGNED_OUT);
  if (!isDriveConfigured() || !isAdminConfigured()) return fail(NOT_CONFIGURED);

  const limit = await rateLimit("drive_sync", LIMITS.mutate.limit, LIMITS.mutate.window);
  if (!limit.allowed) return fail(`Too many sync requests. Try again in ${limit.retryAfterSeconds}s.`);

  // RLS proves ownership: another user's post id simply returns no row.
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select("*").eq("id", parsedId.data).maybeSingle();
  if (error) return fail("Couldn't load that post. Please try again.");
  if (!data) return fail("Post not found");
  const post: PostRow = data;

  const result = await syncPostToDrive(post);
  revalidatePath("/dashboard");
  if (!result.ok) return fail(result.error);
  return ok({ fileId: result.fileId }, "Synced to Google Drive");
}

export async function syncAllPosts(): Promise<ActionResult<{ synced: number; failed: number }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SIGNED_OUT);
  if (!isDriveConfigured() || !isAdminConfigured()) return fail(NOT_CONFIGURED);

  const limit = await rateLimit("drive_sync", LIMITS.mutate.limit, LIMITS.mutate.window);
  if (!limit.allowed) return fail(`Too many sync requests. Try again in ${limit.retryAfterSeconds}s.`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return fail("Couldn't load your posts. Please try again.");

  const rows: PostRow[] = data ?? [];
  const stale = rows
    .filter(
      (p) =>
        !p.drive_synced_at ||
        new Date(p.updated_at).getTime() - new Date(p.drive_synced_at).getTime() > SYNC_SLACK_MS,
    )
    .slice(0, MAX_BULK_SYNC);

  let synced = 0;
  let failed = 0;
  for (const post of stale) {
    const result = await syncPostToDrive(post);
    if (result.ok) {
      synced += 1;
      continue;
    }
    if (result.error === "Google Drive isn't connected") {
      revalidatePath("/dashboard");
      return fail("Connect Google Drive first");
    }
    failed += 1;
  }

  revalidatePath("/dashboard");
  const message =
    stale.length === 0
      ? "Everything is already in sync"
      : `Synced ${synced} post${synced === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""}`;
  return ok({ synced, failed }, message);
}
