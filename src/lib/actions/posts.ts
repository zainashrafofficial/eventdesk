"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/actions/types";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { POST_COLUMNS } from "@/lib/data/posts";
import { deletePostFromDrive, getDriveStatus, syncPostToDrive } from "@/lib/services/google-drive";
import { sendScheduledConfirmation } from "@/lib/services/email";
import {
  isFutureTime,
  platformLengthError,
  postIdSchema,
  postSchema,
  postUpdateSchema,
  type PostInput,
  type PostUpdateInput,
} from "@/lib/validation/post";
import type { PostRow } from "@/types/db";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";
const CHECK_FIELDS = "Check the highlighted fields.";
const NOT_FOUND = "That post no longer exists. It may have been deleted.";

type DbError = { code?: string; message: string };

/** Map Postgres / PostgREST errors to friendly copy (never leak raw DB messages to the UI). */
function dbFail(error: DbError, fallback: string): ActionResult<never> {
  console.error("[posts] database error:", error.code, error.message);
  switch (error.code) {
    case "23514": // check_violation
      return fail("Some values were rejected. Check the caption length, hashtags and schedule, then try again.");
    case "23502": // not_null_violation
      return fail("A required field is missing. Check the caption and try again.");
    case "42501": // insufficient_privilege (RLS)
      return fail("You don't have permission to change this post.");
    case "PGRST116": // .single() found no row
      return fail(NOT_FOUND);
    default:
      return fail(fallback);
  }
}

async function rateLimited(): Promise<ActionResult<never> | null> {
  const rl = await rateLimit("mutate", LIMITS.mutate.limit, LIMITS.mutate.window);
  if (!rl.allowed) return fail(`Too many changes. Try again in ${rl.retryAfterSeconds}s.`);
  return null;
}

/** Sync to Drive only when the user has connected it. Returns the post with fresh Drive fields. */
async function syncIfConnected(post: PostRow): Promise<{ post: PostRow; synced: boolean }> {
  try {
    const status = await getDriveStatus(post.user_id);
    if (!status.connected) return { post, synced: false };
    const drive = await syncPostToDrive(post);
    if (!drive.ok) return { post: { ...post, drive_sync_error: drive.error }, synced: false };
    return {
      post: { ...post, drive_file_id: drive.fileId, drive_synced_at: new Date().toISOString(), drive_sync_error: null },
      synced: true,
    };
  } catch (err: unknown) {
    console.error("[posts] Drive sync failed:", err);
    return { post, synced: false };
  }
}

async function confirmSchedule(post: PostRow): Promise<void> {
  try {
    await sendScheduledConfirmation(post);
  } catch (err: unknown) {
    console.error("[posts] confirmation email failed:", err);
  }
}

function sameTime(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return Date.parse(a) === Date.parse(b);
}

// ---------------------------------------------------------------------------

export async function createPost(
  input: PostInput,
): Promise<ActionResult<{ post: PostRow; driveSynced: boolean; emailQueued: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return fail(CHECK_FIELDS, zodFieldErrors(parsed.error));
  const data = parsed.data;

  const limited = await rateLimited();
  if (limited) return limited;

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      caption: data.caption,
      hashtags: data.hashtags,
      platform: data.platform,
      tone: data.tone,
      prompt: data.prompt,
      notes: data.notes,
      status: data.status,
      scheduled_at: data.scheduled_at,
      notify: data.notify,
    })
    .select(POST_COLUMNS)
    .single()
    .overrideTypes<PostRow, { merge: false }>();

  if (error || !inserted) return dbFail(error ?? { message: "No row returned" }, "We couldn't save your post. Please try again.");

  const { post, synced } = await syncIfConnected(inserted);
  if (post.status === "scheduled") await confirmSchedule(post);

  revalidatePath("/dashboard");
  return ok(
    { post, driveSynced: synced, emailQueued: post.status === "scheduled" && post.notify },
    synced ? "Saved and synced to Google Drive." : "Saved.",
  );
}

export async function updatePost(id: string, input: PostUpdateInput): Promise<ActionResult<{ post: PostRow }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const idParsed = postIdSchema.safeParse(id);
  if (!idParsed.success) return fail(NOT_FOUND);

  const parsed = postUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(CHECK_FIELDS, zodFieldErrors(parsed.error));
  const patch = parsed.data;

  const limited = await rateLimited();
  if (limited) return limited;

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("id", idParsed.data)
    .eq("user_id", user.id)
    .maybeSingle()
    .overrideTypes<PostRow, { merge: false }>();

  if (readError) return dbFail(readError, "We couldn't load that post. Please try again.");
  if (!existing) return fail(NOT_FOUND);

  // Validate against the merged (existing + patch) values.
  const merged = {
    caption: patch.caption ?? existing.caption,
    hashtags: patch.hashtags ?? existing.hashtags,
    platform: patch.platform ?? existing.platform,
    status: patch.status ?? existing.status,
    scheduled_at: patch.scheduled_at !== undefined ? patch.scheduled_at : existing.scheduled_at,
  };

  if (patch.caption !== undefined || patch.hashtags !== undefined || patch.platform !== undefined) {
    const tooLong = platformLengthError(merged.platform, merged.caption, merged.hashtags);
    if (tooLong) return fail(CHECK_FIELDS, { caption: tooLong });
  }

  const timeChanged = patch.scheduled_at !== undefined && !sameTime(patch.scheduled_at, existing.scheduled_at);
  const statusChanged = patch.status !== undefined && patch.status !== existing.status;
  const becameScheduled = statusChanged && merged.status === "scheduled";

  if (merged.status === "scheduled") {
    if (!merged.scheduled_at) return fail(CHECK_FIELDS, { scheduled_at: "Pick a date and time to schedule." });
    if ((timeChanged || becameScheduled) && !isFutureTime(merged.scheduled_at)) {
      return fail(CHECK_FIELDS, { scheduled_at: "Pick a time in the future." });
    }
  }

  const update: Partial<PostRow> = {};
  if (patch.caption !== undefined) update.caption = patch.caption;
  if (patch.hashtags !== undefined) update.hashtags = patch.hashtags;
  if (patch.platform !== undefined) update.platform = patch.platform;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.notify !== undefined) update.notify = patch.notify;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.scheduled_at !== undefined) update.scheduled_at = patch.scheduled_at;
  if (timeChanged || statusChanged) {
    // A new schedule deserves a fresh confirmation and reminder.
    update.reminder_sent_at = null;
    update.confirmation_sent_at = null;
  }

  const { data: updated, error } = await supabase
    .from("posts")
    .update(update)
    .eq("id", existing.id)
    .eq("user_id", user.id)
    .select(POST_COLUMNS)
    .single()
    .overrideTypes<PostRow, { merge: false }>();

  if (error || !updated) return dbFail(error ?? { message: "No row returned" }, "We couldn't update your post. Please try again.");

  const { post } = await syncIfConnected(updated);
  if ((timeChanged || becameScheduled) && post.status === "scheduled") await confirmSchedule(post);

  revalidatePath("/dashboard");
  return ok({ post }, "Post updated.");
}

export async function deletePost(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const idParsed = postIdSchema.safeParse(id);
  if (!idParsed.success) return fail(NOT_FOUND);

  const limited = await rateLimited();
  if (limited) return limited;

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("posts")
    .select("id, drive_file_id")
    .eq("id", idParsed.data)
    .eq("user_id", user.id)
    .maybeSingle()
    .overrideTypes<Pick<PostRow, "id" | "drive_file_id">, { merge: false }>();

  if (readError) return dbFail(readError, "We couldn't delete that post. Please try again.");
  if (!existing) return fail(NOT_FOUND);

  const { error } = await supabase.from("posts").delete().eq("id", existing.id).eq("user_id", user.id);
  if (error) return dbFail(error, "We couldn't delete that post. Please try again.");

  if (existing.drive_file_id) {
    try {
      await deletePostFromDrive(user.id, existing.drive_file_id);
    } catch (err: unknown) {
      console.error("[posts] Drive delete failed:", err);
    }
  }

  revalidatePath("/dashboard");
  return ok(undefined, "Post deleted.");
}

/** Copy a post as a new draft (no schedule, no Drive file, no emails sent yet). */
export async function duplicatePost(id: string): Promise<ActionResult<{ post: PostRow }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const idParsed = postIdSchema.safeParse(id);
  if (!idParsed.success) return fail(NOT_FOUND);

  const limited = await rateLimited();
  if (limited) return limited;

  const supabase = await createClient();
  const { data: source, error: readError } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("id", idParsed.data)
    .eq("user_id", user.id)
    .maybeSingle()
    .overrideTypes<PostRow, { merge: false }>();

  if (readError) return dbFail(readError, "We couldn't duplicate that post. Please try again.");
  if (!source) return fail(NOT_FOUND);

  const { data: inserted, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      caption: source.caption,
      hashtags: source.hashtags,
      platform: source.platform,
      tone: source.tone,
      prompt: source.prompt,
      notes: source.notes,
      status: "draft",
      scheduled_at: null,
      notify: source.notify,
    })
    .select(POST_COLUMNS)
    .single()
    .overrideTypes<PostRow, { merge: false }>();

  if (error || !inserted) return dbFail(error ?? { message: "No row returned" }, "We couldn't duplicate that post. Please try again.");

  const { post } = await syncIfConnected(inserted);

  revalidatePath("/dashboard");
  return ok({ post }, "Duplicated as a draft.");
}
