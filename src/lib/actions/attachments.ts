"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ATTACHMENT_TYPES, BUCKET, MAX_FILE_BYTES } from "@/lib/storage";
import { fail, ok, type ActionResult } from "@/lib/actions/types";

/**
 * Cloud storage pipeline:
 *   1. Browser validates type/size, then uploads the bytes straight to the private
 *      Supabase Storage bucket under {user_id}/{event_id}/ (storage RLS checks the folder).
 *   2. This action re-validates the metadata on the server and records it in Postgres.
 *   3. Pages read the rows and render files through short-lived signed URLs.
 */

const attachmentSchema = z.object({
  file_path: z.string().min(3).max(400),
  file_name: z.string().trim().min(1).max(255),
  mime_type: z.enum(ATTACHMENT_TYPES, "That file type isn't supported."),
  size_bytes: z.number().int().positive().max(MAX_FILE_BYTES, "Files must be 10 MB or smaller."),
});

export async function addAttachment(
  eventId: string,
  input: z.input<typeof attachmentSchema>,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Please sign in again.");
  if (!z.uuid().safeParse(eventId).success) return fail("Invalid event id.");

  const parsed = attachmentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid file.");
  if (!parsed.data.file_path.startsWith(`${user.id}/${eventId}/`)) return fail("Invalid file location.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .insert({ ...parsed.data, event_id: eventId, user_id: user.id })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[addAttachment]", error?.message);
    return fail("Couldn't save the file record. Please try again.");
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard");
  return ok({ id: data.id as string }, "File uploaded.");
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Please sign in again.");
  if (!z.uuid().safeParse(id).success) return fail("Invalid file id.");

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("attachments")
    .select("file_path, event_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return fail("That file no longer exists.");

  const { error } = await supabase.from("attachments").delete().eq("id", id).eq("user_id", user.id);
  if (error) return fail("Couldn't delete the file. Please try again.");

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([row.file_path as string]);
  if (storageError) console.warn("[deleteAttachment] storage cleanup failed:", storageError.message);

  revalidatePath(`/dashboard/events/${row.event_id}`);
  revalidatePath("/dashboard");
  return ok(undefined, "File deleted.");
}
