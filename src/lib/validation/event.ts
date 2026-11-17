import { z } from "zod";
import { EVENT_CATEGORIES, EVENT_STATUSES } from "@/config/events";

/**
 * ONE schema, used twice:
 *   - client side in the form (instant field errors before any request)
 *   - server side in the Server Action (never trust the browser)
 * The database CHECK constraints are the third and final line of defence.
 */

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullable()
    .transform((v) => (v ? v : null));

export const eventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Give the event a title of at least 3 characters.")
      .max(120, "Keep the title under 120 characters."),
    description: optionalText(2000, "Keep the description under 2000 characters."),
    category: z.enum(EVENT_CATEGORIES, "Choose a category."),
    status: z.enum(EVENT_STATUSES, "Choose a status."),
    starts_at: z
      .string()
      .min(1, "Pick a date and time.")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Pick a valid date and time.")
      .refine((v) => {
        const year = new Date(v).getUTCFullYear();
        return year >= 2000 && year <= 2100;
      }, "Pick a date between 2000 and 2100."),
    capacity: z
      .number("Capacity must be a number.")
      .int("Capacity must be a whole number.")
      .min(1, "Capacity must be at least 1.")
      .max(100000, "Capacity can't exceed 100,000.")
      .nullable(),
    location_name: optionalText(200, "Location name is too long."),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    cover_path: z.string().max(400).nullable(),
  })
  .refine((v) => (v.latitude === null) === (v.longitude === null), {
    path: ["location_name"],
    message: "Pick the location from the search results.",
  });

export type EventInput = z.input<typeof eventSchema>;
export type EventValues = z.output<typeof eventSchema>;

/** Query-string filters for the events list. Invalid values fall back to defaults. */
export const eventFiltersSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum([...EVENT_STATUSES, "all"]).catch("all"),
  category: z.enum([...EVENT_CATEGORIES, "all"]).catch("all"),
  sort: z.enum(["soonest", "latest", "newest", "title"]).catch("soonest"),
  when: z.enum(["all", "upcoming", "past"]).catch("all"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

export type EventFilters = z.output<typeof eventFiltersSchema>;
