/**
 * Storage rules shared by the browser (pre-upload checks) and the server (re-checks).
 * The bucket itself also enforces size + MIME type (see supabase/migrations).
 */

export const BUCKET = "event-files";
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB, matches the bucket limit
export const SIGNED_URL_TTL = 60 * 60; // 1 hour

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const ATTACHMENT_TYPES = [
  ...IMAGE_TYPES,
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.docx";
export const IMAGE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif";

export function isImage(mime: string) {
  return (IMAGE_TYPES as readonly string[]).includes(mime);
}

/** Returns an error message, or null when the file is acceptable. */
export function validateFile(file: { size: number; type: string }, allowed: readonly string[]) {
  if (file.size <= 0) return "That file is empty.";
  if (file.size > MAX_FILE_BYTES) return "Files must be 10 MB or smaller.";
  if (!allowed.includes(file.type)) return "That file type isn't supported.";
  return null;
}

/** Make a filename safe for object keys while keeping it readable. */
export function safeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^.\w]/g, "") : "";
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${base || "file"}-${stamp}${ext}`;
}

/** {user_id}/covers/{file}: the first folder MUST be the user id (storage RLS). */
export const coverPath = (userId: string, fileName: string) => `${userId}/covers/${safeFileName(fileName)}`;

/** {user_id}/{event_id}/{file} */
export const attachmentPath = (userId: string, eventId: string, fileName: string) =>
  `${userId}/${eventId}/${safeFileName(fileName)}`;
