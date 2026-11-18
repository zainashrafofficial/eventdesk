import { z } from "zod";

/**
 * Notification settings form schema. Shared by the settings sheet (client) and
 * saveNotificationSettings (Server Action). Mirrors the CHECK constraints on
 * public.notification_settings.
 */

/** True when `tz` is an IANA time zone this runtime understands (e.g. "Asia/Karachi"). */
export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    if (typeof Intl.supportedValuesOf === "function" && Intl.supportedValuesOf("timeZone").includes(tz)) {
      return true;
    }
    // Aliases such as "UTC" or "Asia/Calcutta" are valid but not always listed.
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const REMINDER_PRESETS = [0, 5, 15, 30, 60, 120, 1440] as const;
export type ReminderPreset = (typeof REMINDER_PRESETS)[number];

export const REMINDER_PRESET_LABELS: Record<ReminderPreset, string> = {
  0: "At post time",
  5: "5 minutes before",
  15: "15 minutes before",
  30: "30 minutes before",
  60: "1 hour before",
  120: "2 hours before",
  1440: "1 day before",
};

/** Presets as `{ value, label }` pairs, ready for a select. */
export const REMINDER_OPTIONS: { value: ReminderPreset; label: string }[] = REMINDER_PRESETS.map((value) => ({
  value,
  label: REMINDER_PRESET_LABELS[value],
}));

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const notificationSettingsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address.")
    .max(254, "Email must be 254 characters or fewer.")
    .regex(EMAIL_PATTERN, "Enter a valid email address."),
  enabled: z.boolean(),
  notify_on_schedule: z.boolean(),
  remind_before_minutes: z
    .number({ error: "Choose when to be reminded." })
    .int("Reminder must be a whole number of minutes.")
    .min(0, "Reminder can't be negative.")
    .max(1440, "Reminder can be at most 1 day (1440 minutes) before."),
  include_caption: z.boolean(),
  subject_prefix: z
    .string()
    .trim()
    .min(1, "Add a subject prefix (for example “Cadence”).")
    .max(40, "Subject prefix must be 40 characters or fewer."),
  timezone: z
    .string()
    .trim()
    .min(1, "Choose a time zone.")
    .max(64, "Time zone is too long.")
    .refine(isValidTimeZone, "Choose a valid time zone."),
});

export type NotificationSettingsInput = {
  email: string;
  enabled: boolean;
  notify_on_schedule: boolean;
  remind_before_minutes: number;
  include_caption: boolean;
  subject_prefix: string;
  timezone: string;
};

/** Parsed (trimmed) values. Same shape as the input. */
export type NotificationSettingsValues = z.output<typeof notificationSettingsSchema>;
