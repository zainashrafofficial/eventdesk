/**
 * Domain vocabulary for the main resource ("events").
 * These lists must match the CHECK constraints in supabase/migrations/*_init.sql.
 */

export const EVENT_CATEGORIES = ["meetup", "workshop", "conference", "social", "sports", "other"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  meetup: "Meetup",
  workshop: "Workshop",
  conference: "Conference",
  social: "Social",
  sports: "Sports",
  other: "Other",
};

export const EVENT_STATUSES = ["planned", "confirmed", "completed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const STATUS_META: Record<EventStatus, { label: string; tone: "neutral" | "accent" | "success" | "danger" }> = {
  planned: { label: "Planned", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "accent" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const SORT_OPTIONS = {
  soonest: { label: "Soonest first", column: "starts_at", ascending: true },
  latest: { label: "Latest first", column: "starts_at", ascending: false },
  newest: { label: "Recently added", column: "created_at", ascending: false },
  title: { label: "Title A–Z", column: "title", ascending: true },
} as const;
export type SortKey = keyof typeof SORT_OPTIONS;

export const PAGE_SIZE = 9;
