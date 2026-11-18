import "server-only";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getDriveStatus } from "@/lib/services/google-drive";
import { getNotificationLog, getNotificationSettings } from "@/lib/actions/notifications";
import type { DriveStatus, NotificationLogRow, NotificationSettings, PostRow } from "@/types/db";

/** Every column of public.posts, in table order. Shared by reads and the Server Actions' `.select()`. */
export const POST_COLUMNS =
  "id, user_id, prompt, caption, hashtags, platform, tone, notes, status, scheduled_at, notify, " +
  "confirmation_sent_at, reminder_sent_at, drive_file_id, drive_synced_at, drive_sync_error, created_at, updated_at";

export type StudioStats = { total: number; scheduled: number; drafts: number; synced: number };

export type StudioData = {
  posts: PostRow[];
  drive: DriveStatus;
  settings: NotificationSettings;
  log: NotificationLogRow[];
  stats: StudioStats;
};

const DRIVE_FALLBACK: DriveStatus = {
  connected: false,
  configured: false,
  googleEmail: null,
  folderId: null,
  folderUrl: null,
};

/** 0 = upcoming scheduled, 1 = drafts, 2 = past (scheduled time passed, or published). */
function bucket(post: PostRow, now: number): 0 | 1 | 2 {
  if (post.status === "draft") return 1;
  if (post.status === "scheduled" && post.scheduled_at && Date.parse(post.scheduled_at) >= now) return 0;
  return 2;
}

function time(iso: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** Upcoming posts soonest first, then drafts (newest first), then past posts (most recent first). */
export function sortPosts(posts: PostRow[], now: number = Date.now()): PostRow[] {
  return [...posts].sort((a, b) => {
    const ba = bucket(a, now);
    const bb = bucket(b, now);
    if (ba !== bb) return ba - bb;
    if (ba === 0) return time(a.scheduled_at) - time(b.scheduled_at);
    if (ba === 1) return time(b.created_at) - time(a.created_at);
    return time(b.scheduled_at ?? b.created_at) - time(a.scheduled_at ?? a.created_at);
  });
}

/** The current user's posts (RLS + explicit owner filter), scheduled soonest first, drafts after. */
export async function listPosts(): Promise<PostRow[]> {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("user_id", user.id)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .overrideTypes<PostRow[], { merge: false }>();

  if (error) {
    console.error("[posts] listPosts failed:", error.message);
    throw new Error("We couldn't load your posts. Please refresh the page.");
  }
  return sortPosts(data ?? []);
}

/** Everything the single-page studio needs, fetched in parallel. Integrations never crash the page. */
export async function getStudioData(): Promise<StudioData> {
  const user = await requireUser("/dashboard");

  const settingsFallback = (): NotificationSettings => ({
    user_id: user.id,
    email: user.email,
    enabled: true,
    notify_on_schedule: true,
    remind_before_minutes: 15,
    include_caption: true,
    subject_prefix: "Cadence",
    timezone: "Asia/Karachi",
    updated_at: new Date().toISOString(),
  });

  const [posts, drive, settings, log] = await Promise.all([
    listPosts(),
    getDriveStatus(user.id).catch((err: unknown): DriveStatus => {
      console.error("[posts] getDriveStatus failed:", err);
      return DRIVE_FALLBACK;
    }),
    getNotificationSettings().catch((err: unknown): NotificationSettings => {
      console.error("[posts] getNotificationSettings failed:", err);
      return settingsFallback();
    }),
    getNotificationLog(8).catch((err: unknown): NotificationLogRow[] => {
      console.error("[posts] getNotificationLog failed:", err);
      return [];
    }),
  ]);

  const stats: StudioStats = {
    total: posts.length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    drafts: posts.filter((p) => p.status === "draft").length,
    synced: posts.filter((p) => p.drive_file_id !== null).length,
  };

  return { posts, drive, settings, log, stats };
}
