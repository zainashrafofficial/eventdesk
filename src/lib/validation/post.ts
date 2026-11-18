import { z } from "zod";
import { PLATFORMS, PLATFORM_LABELS, PLATFORM_LIMITS, type Platform } from "@/types/db";

/**
 * Post schemas shared by the composer / feed editor (client) and the Server Actions (server).
 * Mirrors the CHECK constraints on public.posts so the database never has to reject a value.
 */

export const CAPTION_MAX = 2200;
export const HASHTAGS_MAX = 30;
export const HASHTAG_MAX_LENGTH = 60;
export const NOTES_MAX = 1000;
/** Allow a little clock drift / slow form submits when checking "in the future". */
const SCHEDULE_GRACE_MS = 5 * 60 * 1000;

/** Strip '#', trim, remove inner whitespace, drop empties and dedupe (case-insensitive, first wins). */
export function normalizeHashtags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#+/, "").replace(/\s+/g, "");
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/** The text as it would be published: caption, blank line, then "#tag #tag". */
export function composePostText(caption: string, hashtags: readonly string[]): string {
  const tags = hashtags.map((t) => `#${t}`).join(" ");
  return tags ? `${caption}\n\n${tags}` : caption;
}

/** Returns an error message when caption + hashtags exceed the platform limit, otherwise null. */
export function platformLengthError(platform: Platform, caption: string, hashtags: readonly string[]): string | null {
  const limit = PLATFORM_LIMITS[platform];
  if (composePostText(caption, hashtags).length <= limit) return null;
  return `Too long for ${PLATFORM_LABELS[platform]} (${limit} characters max).`;
}

/** True when the ISO time is not in the past (with a small grace window). */
export function isFutureTime(iso: string, now: number = Date.now()): boolean {
  return Date.parse(iso) > now - SCHEDULE_GRACE_MS;
}

// ---------------------------------------------------------------------------
// Field schemas (no defaults here, so partial updates never overwrite omitted fields)

const captionField = z
  .string({ error: "Write a caption." })
  .trim()
  .min(1, "Write a caption.")
  .max(CAPTION_MAX, `Keep the caption under ${CAPTION_MAX} characters.`);

const hashtagsField = z
  .array(z.string().max(200, "That hashtag is too long."), { error: "Hashtags must be a list." })
  .max(200, `Use at most ${HASHTAGS_MAX} hashtags.`)
  .transform(normalizeHashtags)
  .pipe(
    z
      .array(z.string().max(HASHTAG_MAX_LENGTH, `Keep each hashtag under ${HASHTAG_MAX_LENGTH} characters.`))
      .max(HASHTAGS_MAX, `Use at most ${HASHTAGS_MAX} hashtags.`),
  );

const platformField = z.enum(PLATFORMS, { error: "Pick a platform." });

/** Trimmed optional text; empty becomes null. */
function nullableText(max: number, message: string) {
  return z
    .string()
    .nullable()
    .transform((v) => {
      const t = v?.trim() ?? "";
      return t ? t : null;
    })
    .pipe(z.string().max(max, message).nullable());
}

const toneField = nullableText(40, "Keep the tone under 40 characters.");
const promptField = nullableText(500, "Keep the prompt under 500 characters.");
const notesField = nullableText(NOTES_MAX, `Keep task details under ${NOTES_MAX} characters.`);

const statusField = z.enum(["draft", "scheduled"], { error: "Choose draft or scheduled." });

/** ISO date string (normalised to UTC ISO) or null; empty string becomes null. */
const scheduledAtField = z
  .string()
  .nullable()
  .transform((v, ctx) => {
    if (v === null || v.trim() === "") return null;
    const t = Date.parse(v);
    if (Number.isNaN(t)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date and time." });
      return z.NEVER;
    }
    return new Date(t).toISOString();
  });

const notifyField = z.boolean({ error: "Choose whether to get an email." });

// ---------------------------------------------------------------------------
// Create

export const postSchema = z
  .object({
    caption: captionField,
    hashtags: hashtagsField.default([]),
    platform: platformField,
    tone: toneField.default(null),
    prompt: promptField.default(null),
    notes: notesField.default(null),
    status: statusField,
    scheduled_at: scheduledAtField.default(null),
    notify: notifyField.default(true),
  })
  .superRefine((v, ctx) => {
    if (v.status === "scheduled") {
      if (!v.scheduled_at) {
        ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "Pick a date and time to schedule." });
      } else if (!isFutureTime(v.scheduled_at)) {
        ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "Pick a time in the future." });
      }
    }
    const tooLong = platformLengthError(v.platform, v.caption, v.hashtags);
    if (tooLong) ctx.addIssue({ code: "custom", path: ["caption"], message: tooLong });
  });

export type PostInput = z.input<typeof postSchema>;
export type PostData = z.output<typeof postSchema>;

// ---------------------------------------------------------------------------
// Update (partial; merged-value checks such as platform length happen in the action)

export const postUpdateSchema = z
  .object({
    caption: captionField.optional(),
    hashtags: hashtagsField.optional(),
    notes: notesField.optional(),
    scheduled_at: scheduledAtField.optional(),
    status: statusField.optional(),
    notify: notifyField.optional(),
    platform: platformField.optional(),
  })
  .superRefine((v, ctx) => {
    if (!Object.values(v).some((x) => x !== undefined)) {
      ctx.addIssue({ code: "custom", path: ["_"], message: "Nothing to update." });
      return;
    }
    if (v.status === "scheduled" && v.scheduled_at === null) {
      ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "Pick a date and time to schedule." });
    }
    if (v.scheduled_at && v.status !== "draft" && !isFutureTime(v.scheduled_at)) {
      ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "Pick a time in the future." });
    }
    if (v.platform && v.caption !== undefined && v.hashtags !== undefined) {
      const tooLong = platformLengthError(v.platform, v.caption, v.hashtags);
      if (tooLong) ctx.addIssue({ code: "custom", path: ["caption"], message: tooLong });
    }
  });

export type PostUpdateInput = z.input<typeof postUpdateSchema>;
export type PostUpdateData = z.output<typeof postUpdateSchema>;

export const postIdSchema = z.uuid("That post couldn't be found.");
