"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { isAdminConfigured, publicEnv } from "@/lib/env";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/actions/types";
import { logEmail, sendEmail } from "@/lib/services/email";
import { testTemplate } from "@/lib/email/templates";
import { notificationSettingsSchema, type NotificationSettingsInput } from "@/lib/validation/notifications";
import type { NotificationLogRow, NotificationSettings } from "@/types/db";

const SETTINGS_COLUMNS =
  "user_id, email, enabled, notify_on_schedule, remind_before_minutes, include_caption, subject_prefix, timezone, updated_at";
const LOG_COLUMNS = "id, user_id, post_id, kind, sent_to, status, error, created_at";

function defaults(userId: string, email: string): NotificationSettings {
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

/** The user's saved settings, or sensible defaults addressed to their account email. */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const user = await requireUser();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notification_settings")
      .select(SETTINGS_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle<NotificationSettings>();
    if (error) console.error("[notifications] getNotificationSettings:", error.message);
    return data ?? defaults(user.id, user.email);
  } catch (error) {
    console.error("[notifications] getNotificationSettings failed:", error);
    return defaults(user.id, user.email);
  }
}

export async function saveNotificationSettings(
  input: NotificationSettingsInput,
): Promise<ActionResult<NotificationSettings>> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Sign in again.");

  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", zodFieldErrors(parsed.error));

  const limit = await rateLimit("mutate", LIMITS.mutate.limit, LIMITS.mutate.window);
  if (!limit.allowed) {
    return fail(`You're doing that too often. Try again in ${limit.retryAfterSeconds}s.`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_settings")
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" })
    .select(SETTINGS_COLUMNS)
    .single<NotificationSettings>();

  if (error || !data) {
    console.error("[notifications] saveNotificationSettings:", error?.message);
    return fail("Couldn't save your notification settings. Try again.");
  }

  revalidatePath("/dashboard");
  return ok(data, "Notification settings saved.");
}

export async function sendTestEmail(): Promise<ActionResult<{ to: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Sign in again.");

  const limit = await rateLimit("email", LIMITS.email.limit, LIMITS.email.window);
  if (!limit.allowed) {
    return fail(`Too many test emails. Try again in ${limit.retryAfterSeconds}s.`);
  }

  const settings = await getNotificationSettings();
  if (!settings.email) return fail("Add an email address in Notification settings first.");

  const content = testTemplate({ settings, appUrl: publicEnv.siteUrl });
  const result = await sendEmail({ to: settings.email, ...content });

  if (isAdminConfigured()) {
    try {
      await logEmail(createAdminClient(), {
        userId: user.id,
        postId: null,
        kind: "test",
        sentTo: settings.email,
        result,
      });
    } catch (error) {
      console.error("[notifications] test log failed:", error);
    }
  }

  revalidatePath("/dashboard");
  if (!result.ok) return fail(result.error);
  return ok({ to: settings.email }, `Test email sent to ${settings.email}.`);
}

export async function getNotificationLog(limit = 8): Promise<NotificationLogRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const size = Math.min(Math.max(Math.trunc(limit) || 8, 1), 50);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notification_log")
      .select(LOG_COLUMNS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(size)
      .returns<NotificationLogRow[]>();
    if (error) {
      console.error("[notifications] getNotificationLog:", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error("[notifications] getNotificationLog failed:", error);
    return [];
  }
}
