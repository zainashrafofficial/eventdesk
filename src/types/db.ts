/**
 * Shared domain types for Cadence. Mirrors supabase/migrations/20261118000002_cadence.sql.
 * Every module imports from here; never redefine these shapes locally. No `any` anywhere.
 */

export const PLATFORMS = ["instagram", "x", "linkedin", "facebook", "tiktok"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  tiktok: "TikTok",
};

/** Recommended caption length per platform (X hard limit is 280). */
export const PLATFORM_LIMITS: Record<Platform, number> = {
  instagram: 2200,
  x: 280,
  linkedin: 3000,
  facebook: 2200,
  tiktok: 2200,
};

export const TONES = ["professional", "playful", "inspirational", "witty", "bold", "friendly"] as const;
export type Tone = (typeof TONES)[number];

export const POST_STATUSES = ["draft", "scheduled", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export type PostRow = {
  id: string;
  user_id: string;
  prompt: string | null;
  caption: string;
  hashtags: string[];
  platform: Platform;
  tone: string | null;
  notes: string | null;
  status: PostStatus;
  scheduled_at: string | null;
  notify: boolean;
  confirmation_sent_at: string | null;
  reminder_sent_at: string | null;
  drive_file_id: string | null;
  drive_synced_at: string | null;
  drive_sync_error: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationSettings = {
  user_id: string;
  email: string;
  enabled: boolean;
  notify_on_schedule: boolean;
  remind_before_minutes: number;
  include_caption: boolean;
  subject_prefix: string;
  timezone: string;
  updated_at: string;
};

export type NotificationLogRow = {
  id: string;
  user_id: string;
  post_id: string | null;
  kind: "scheduled" | "reminder" | "test";
  sent_to: string;
  status: "sent" | "failed";
  error: string | null;
  created_at: string;
};

/** Safe, client-visible view of a Drive connection (the refresh token is never selected). */
export type DriveStatus = {
  connected: boolean;
  configured: boolean; // GOOGLE_CLIENT_ID/SECRET present on the server
  googleEmail: string | null;
  folderId: string | null;
  folderUrl: string | null;
};

/** One AI-generated caption option. */
export type CaptionOption = {
  caption: string;
  hashtags: string[]; // without the leading '#'
};

export type GenerateRequest = {
  prompt: string;
  platform: Platform;
  tone: Tone;
  count: 2 | 3;
};

export type GenerateResponse =
  | { ok: true; options: CaptionOption[]; model: string; remaining: number }
  | { ok: false; error: string; retryAfterSeconds?: number };
