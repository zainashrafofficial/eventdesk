import type { EventCategory, EventStatus } from "@/config/events";

/** Row shape of public.events (see supabase/migrations). */
export type EventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  status: EventStatus;
  starts_at: string;
  capacity: number | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  cover_path: string | null;
  created_at: string;
  updated_at: string;
};

/** Row shape of public.attachments. */
export type AttachmentRow = {
  id: string;
  event_id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

/** An event plus a short-lived signed URL for its cover image. */
export type EventWithCover = EventRow & { cover_url: string | null };

/** An attachment plus a short-lived signed URL. */
export type AttachmentWithUrl = AttachmentRow & { url: string | null };
