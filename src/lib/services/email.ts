import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminConfigured, isEmailConfigured, publicEnv, serverEnv } from "@/lib/env";
import { reminderTemplate, scheduledTemplate } from "@/lib/email/templates";
import type { NotificationLogRow, NotificationSettings, PostRow } from "@/types/db";

/**
 * Email delivery through the Resend REST API (no SDK), plus the two automated flows:
 * a confirmation when a post is scheduled and a reminder before it goes live (cron).
 * Nothing in here throws: failures are returned / logged to notification_log.
 */

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;
const REMINDER_LOOKAHEAD_MS = 24 * 60 * 60 * 1000; // max remind_before_minutes (1440)
const STALE_AFTER_MS = 6 * 60 * 60 * 1000; // never remind about posts more than 6h in the past

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Unknown error";
}

function readResendError(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string" && record.message) return `Resend: ${record.message}`;
    if (typeof record.error === "string" && record.error) return `Resend: ${record.error}`;
  }
  return `Resend responded with HTTP ${status}.`;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  if (!isEmailConfigured()) return { ok: false, error: "Email isn't configured (RESEND_API_KEY)." };
  const env = serverEnv();

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: readResendError(body, res.status) };

    const id =
      body && typeof body === "object" && typeof (body as Record<string, unknown>).id === "string"
        ? ((body as Record<string, unknown>).id as string)
        : "";
    return { ok: true, id };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, error: "The email service timed out. Try again in a moment." };
    }
    return { ok: false, error: `Couldn't reach the email service: ${errorMessage(error)}` };
  }
}

/* ---------------------------------------------------------------- helpers */

function defaultSettings(userId: string, email: string): NotificationSettings {
  return {
    user_id: userId,
    email,
    enabled: true,
    notify_on_schedule: true,
    remind_before_minutes: 15,
    include_caption: true,
    subject_prefix: "Cadence",
    timezone: "Asia/Karachi",
    updated_at: new Date().toISOString(),
  };
}

/** Saved settings, or defaults addressed to the account email. Null when no address is known. */
async function loadSettings(admin: SupabaseClient, userId: string): Promise<NotificationSettings | null> {
  try {
    const { data, error } = await admin
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle<NotificationSettings>();
    if (error) console.error("[email] loadSettings:", error.message);
    if (data) return data;

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError) console.error("[email] getUserById:", userError.message);
    const email = userData?.user?.email ?? "";
    return email ? defaultSettings(userId, email) : null;
  } catch (error) {
    console.error("[email] loadSettings failed:", errorMessage(error));
    return null;
  }
}

type LogInput = {
  userId: string;
  postId: string | null;
  kind: NotificationLogRow["kind"];
  sentTo: string;
  result: SendEmailResult;
};

/** Writes one notification_log row with the admin client (clients only have SELECT). */
export async function logEmail(admin: SupabaseClient, input: LogInput): Promise<void> {
  try {
    const { error } = await admin.from("notification_log").insert({
      user_id: input.userId,
      post_id: input.postId,
      kind: input.kind,
      sent_to: input.sentTo,
      status: input.result.ok ? "sent" : "failed",
      error: input.result.ok ? null : input.result.error.slice(0, 500),
    });
    if (error) console.error("[email] logEmail:", error.message);
  } catch (error) {
    console.error("[email] logEmail failed:", errorMessage(error));
  }
}

const RETRY_BACKOFF_MS = 10 * 60 * 1000;

/** True when a reminder for this post failed in the last 10 minutes (avoid retrying every cron tick). */
async function failedRecently(admin: SupabaseClient, postId: string, now: number): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from("notification_log")
      .select("id")
      .eq("post_id", postId)
      .eq("kind", "reminder")
      .eq("status", "failed")
      .gte("created_at", new Date(now - RETRY_BACKOFF_MS).toISOString())
      .limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

function appUrl(): string {
  return publicEnv.siteUrl.replace(/\/+$/, "");
}

/* ------------------------------------------------------------ automations */

export async function sendScheduledConfirmation(post: PostRow): Promise<void> {
  try {
    if (post.status !== "scheduled" || !post.notify || !post.scheduled_at) return;
    if (!isAdminConfigured()) return;

    const admin = createAdminClient();
    const settings = await loadSettings(admin, post.user_id);
    if (!settings || !settings.enabled || !settings.notify_on_schedule) return;

    const content = scheduledTemplate({ post, settings, appUrl: appUrl() });
    const result = await sendEmail({ to: settings.email, ...content });
    await logEmail(admin, { userId: post.user_id, postId: post.id, kind: "scheduled", sentTo: settings.email, result });

    if (result.ok) {
      const { error } = await admin
        .from("posts")
        .update({ confirmation_sent_at: new Date().toISOString() })
        .eq("id", post.id);
      if (error) console.error("[email] confirmation_sent_at:", error.message);
    }
  } catch (error) {
    console.error("[email] sendScheduledConfirmation failed:", errorMessage(error));
  }
}

export async function processDueReminders(): Promise<{ checked: number; sent: number; failed: number }> {
  const counts = { checked: 0, sent: 0, failed: 0 };
  if (!isAdminConfigured()) return counts;

  try {
    const admin = createAdminClient();
    const now = Date.now();
    const horizon = new Date(now + REMINDER_LOOKAHEAD_MS).toISOString();
    const staleBefore = new Date(now - STALE_AFTER_MS).toISOString();

    const { data, error } = await admin
      .from("posts")
      .select("*")
      .eq("status", "scheduled")
      .eq("notify", true)
      .is("reminder_sent_at", null)
      .not("scheduled_at", "is", null)
      .gte("scheduled_at", staleBefore)
      .lte("scheduled_at", horizon)
      .order("scheduled_at", { ascending: true })
      .limit(200)
      .returns<PostRow[]>();

    if (error) {
      console.error("[email] processDueReminders query:", error.message);
      return counts;
    }

    const posts = data ?? [];
    counts.checked = posts.length;
    const settingsByUser = new Map<string, NotificationSettings | null>();

    for (const post of posts) {
      if (!post.scheduled_at) continue;

      if (!settingsByUser.has(post.user_id)) {
        settingsByUser.set(post.user_id, await loadSettings(admin, post.user_id));
      }
      const settings = settingsByUser.get(post.user_id);
      if (!settings || !settings.enabled) continue;

      const remindAt = new Date(post.scheduled_at).getTime() - settings.remind_before_minutes * 60_000;
      if (remindAt > now) continue;
      if (await failedRecently(admin, post.id, now)) continue;

      const content = reminderTemplate({ post, settings, appUrl: appUrl() });
      const result = await sendEmail({ to: settings.email, ...content });
      await logEmail(admin, { userId: post.user_id, postId: post.id, kind: "reminder", sentTo: settings.email, result });

      if (result.ok) {
        counts.sent += 1;
        // Guard on reminder_sent_at so two overlapping cron runs can't double-stamp.
        const { error: updateError } = await admin
          .from("posts")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", post.id)
          .is("reminder_sent_at", null);
        if (updateError) console.error("[email] reminder_sent_at:", updateError.message);
      } else {
        counts.failed += 1;
      }
    }
  } catch (error) {
    console.error("[email] processDueReminders failed:", errorMessage(error));
  }

  return counts;
}
