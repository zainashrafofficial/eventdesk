"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/storage";
import { eventSchema, type EventInput } from "@/lib/validation/event";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/actions/types";

/**
 * WRITE side of CRUD (Create, Update, Delete) as Server Actions.
 * Each action: 1) checks the session  2) re-validates input with the shared zod schema
 * 3) writes through the user-scoped client (RLS)  4) revalidates affected pages.
 */

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";
const idSchema = z.uuid("Invalid event id.");

function friendlyDbError(message: string) {
  if (/check constraint/i.test(message)) return "Some values were rejected by the database. Check the form.";
  if (/row-level security/i.test(message)) return "You don't have permission to do that.";
  return "Something went wrong while saving. Please try again.";
}

function ownsCover(userId: string, path: string | null) {
  return path === null || path.startsWith(`${userId}/covers/`);
}

/* ---------------------------------- Create --------------------------------- */

export async function createEvent(input: EventInput): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", zodFieldErrors(parsed.error));
  if (!ownsCover(user.id, parsed.data.cover_path)) return fail("Invalid cover image.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createEvent]", error?.message);
    return fail(friendlyDbError(error?.message ?? ""));
  }

  revalidatePath("/dashboard", "layout");
  return ok({ id: data.id as string }, "Event created.");
}

/* ---------------------------------- Update --------------------------------- */

export async function updateEvent(id: string, input: EventInput): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);
  if (!idSchema.safeParse(id).success) return fail("Invalid event id.");

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", zodFieldErrors(parsed.error));
  if (!ownsCover(user.id, parsed.data.cover_path)) return fail("Invalid cover image.");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("events")
    .select("cover_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return fail("That event no longer exists.");

  const { error } = await supabase.from("events").update(parsed.data).eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("[updateEvent]", error.message);
    return fail(friendlyDbError(error.message));
  }

  // Replaced or removed cover: delete the old file so storage doesn't fill with orphans.
  const oldCover = existing.cover_path as string | null;
  if (oldCover && oldCover !== parsed.data.cover_path) {
    await supabase.storage.from(BUCKET).remove([oldCover]);
  }

  revalidatePath("/dashboard", "layout");
  return ok({ id }, "Changes saved.");
}

/* ---------------------------------- Delete --------------------------------- */

export async function deleteEvent(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);
  if (!idSchema.safeParse(id).success) return fail("Invalid event id.");

  const supabase = await createClient();
  const [{ data: event }, { data: files }] = await Promise.all([
    supabase.from("events").select("cover_path").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("attachments").select("file_path").eq("event_id", id),
  ]);
  if (!event) return fail("That event no longer exists.");

  // Attachments rows are removed by ON DELETE CASCADE.
  const { error } = await supabase.from("events").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("[deleteEvent]", error.message);
    return fail(friendlyDbError(error.message));
  }

  const paths = [event.cover_path as string | null, ...(files ?? []).map((f) => f.file_path as string)].filter(
    (p): p is string => Boolean(p),
  );
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
    if (storageError) console.warn("[deleteEvent] storage cleanup failed:", storageError.message);
  }

  revalidatePath("/dashboard", "layout");
  return ok(undefined, "Event deleted.");
}
