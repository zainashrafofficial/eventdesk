import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { PAGE_SIZE, SORT_OPTIONS, EVENT_STATUSES, type EventStatus } from "@/config/events";
import { BUCKET, SIGNED_URL_TTL } from "@/lib/storage";
import type { EventFilters } from "@/lib/validation/event";
import type { AttachmentRow, AttachmentWithUrl, EventRow, EventWithCover } from "@/types/db";

/**
 * READ side of CRUD. All queries use the user-scoped client, so Postgres RLS
 * guarantees users only ever see their own rows. We also filter by user_id
 * explicitly: it documents intent and lets Postgres use the (user_id, starts_at) index.
 */

const EVENT_COLUMNS =
  "id, user_id, title, description, category, status, starts_at, capacity, location_name, latitude, longitude, cover_path, created_at, updated_at";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Batch-sign storage paths into short-lived URLs (private bucket). */
async function signPaths(supabase: Supabase, paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, SIGNED_URL_TTL);
  if (error) {
    console.error("[storage] signing failed:", error.message);
    return map;
  }
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) map.set(item.path, item.signedUrl);
  }
  return map;
}

async function withCovers(supabase: Supabase, rows: EventRow[]): Promise<EventWithCover[]> {
  const urls = await signPaths(supabase, rows.map((r) => r.cover_path ?? ""));
  return rows.map((r) => ({ ...r, cover_url: r.cover_path ? (urls.get(r.cover_path) ?? null) : null }));
}

/** Strip characters that have meaning inside a PostgREST `or=(...)` filter. */
function sanitizeSearch(q: string) {
  return q.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim();
}

export async function listEvents(filters: EventFilters) {
  const user = await requireUser();
  const supabase = await createClient();
  const sort = SORT_OPTIONS[filters.sort];
  const from = (filters.page - 1) * PAGE_SIZE;

  let query = supabase
    .from("events")
    .select(EVENT_COLUMNS, { count: "exact" })
    .eq("user_id", user.id);

  const q = sanitizeSearch(filters.q);
  if (q) query = query.or(`title.ilike.*${q}*,location_name.ilike.*${q}*,description.ilike.*${q}*`);
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.category !== "all") query = query.eq("category", filters.category);
  const now = new Date().toISOString();
  if (filters.when === "upcoming") query = query.gte("starts_at", now);
  if (filters.when === "past") query = query.lt("starts_at", now);

  const { data, count, error } = await query
    .order(sort.column, { ascending: sort.ascending })
    .order("id", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (error) throw new Error(`Couldn't load events: ${error.message}`);

  const events = await withCovers(supabase, (data ?? []) as EventRow[]);
  const total = count ?? 0;
  return { events, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Cached per request: generateMetadata and the page share one query. */
export const getEvent = cache(async (id: string) => {
  if (!z.uuid().safeParse(id).success) return null;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: event, error }, { data: files, error: filesError }] = await Promise.all([
    supabase.from("events").select(EVENT_COLUMNS).eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("attachments")
      .select("id, event_id, user_id, file_path, file_name, mime_type, size_bytes, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (error) throw new Error(`Couldn't load the event: ${error.message}`);
  if (filesError) throw new Error(`Couldn't load attachments: ${filesError.message}`);
  if (!event) return null;

  const rows = (files ?? []) as AttachmentRow[];
  const row = event as EventRow;
  const urls = await signPaths(supabase, [row.cover_path ?? "", ...rows.map((f) => f.file_path)]);

  const attachments: AttachmentWithUrl[] = rows.map((f) => ({ ...f, url: urls.get(f.file_path) ?? null }));
  const withCover: EventWithCover = { ...row, cover_url: row.cover_path ? (urls.get(row.cover_path) ?? null) : null };
  return { event: withCover, attachments };
});

export async function getDashboard() {
  const user = await requireUser();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const head = () => supabase.from("events").select("id", { count: "exact", head: true }).eq("user_id", user.id);

  const [total, upcoming, files, nextUp, recent, ...byStatus] = await Promise.all([
    head(),
    head().gte("starts_at", now),
    supabase.from("attachments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("user_id", user.id)
      .gte("starts_at", now)
      .neq("status", "cancelled")
      .order("starts_at", { ascending: true })
      .limit(4),
    supabase.from("events").select(EVENT_COLUMNS).eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    ...EVENT_STATUSES.map((s) => head().eq("status", s)),
  ]);

  const firstError = [total, upcoming, files, nextUp, recent, ...byStatus].find((r) => r.error)?.error;
  if (firstError) throw new Error(`Couldn't load the dashboard: ${firstError.message}`);

  const statusCounts = Object.fromEntries(EVENT_STATUSES.map((s, i) => [s, byStatus[i].count ?? 0])) as Record<
    EventStatus,
    number
  >;

  return {
    totals: {
      events: total.count ?? 0,
      upcoming: upcoming.count ?? 0,
      completed: statusCounts.completed,
      files: files.count ?? 0,
    },
    statusCounts,
    nextUp: await withCovers(supabase, (nextUp.data ?? []) as EventRow[]),
    recent: (recent.data ?? []) as EventRow[],
  };
}
