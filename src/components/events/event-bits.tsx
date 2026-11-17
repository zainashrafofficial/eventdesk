import Link from "next/link";
import { CalendarDays, MapPin, Paperclip, Users } from "lucide-react";
import { Badge } from "@/components/ui/display";
import { LocalTime } from "@/components/ui/local-time";
import { CATEGORY_LABELS, STATUS_META, type EventCategory, type EventStatus } from "@/config/events";
import { cn } from "@/lib/utils";
import type { EventRow, EventWithCover } from "@/types/db";

export const DATE_TIME: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

export function StatusBadge({ status }: { status: EventStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: EventCategory }) {
  return <Badge tone="outline">{CATEGORY_LABELS[category]}</Badge>;
}

const CATEGORY_TINT: Record<EventCategory, string> = {
  meetup: "from-[#2b44ff] to-[#7b8cff]",
  workshop: "from-[#1e7a4c] to-[#7cc49e]",
  conference: "from-[#141312] to-[#5a5750]",
  social: "from-[#c8553d] to-[#f1a58f]",
  sports: "from-[#8a6d1f] to-[#f1e07a]",
  other: "from-[#5b4bb7] to-[#b4a9f0]",
};

/** Cover image from storage, or a generated gradient when there isn't one. */
export function EventCover({
  event,
  className,
}: {
  event: Pick<EventWithCover, "title" | "category" | "cover_url">;
  className?: string;
}) {
  if (event.cover_url) {
    return (
      // Signed URLs expire, so a plain <img> avoids caching them in the image optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={event.cover_url} alt={`Cover for ${event.title}`} className={cn("size-full object-cover", className)} loading="lazy" />
    );
  }
  return (
    <div
      aria-hidden
      className={cn("relative grid size-full place-items-center overflow-hidden bg-gradient-to-br", CATEGORY_TINT[event.category], className)}
    >
      <span className="serif select-none text-[5rem] leading-none text-white/25">{event.title.slice(0, 1).toUpperCase()}</span>
    </div>
  );
}

export function EventCard({ event }: { event: EventWithCover }) {
  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift focus-visible:outline-accent"
    >
      <div className="aspect-[16/9] overflow-hidden bg-surface-2">
        <EventCover event={event} className="transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} />
          <CategoryBadge category={event.category} />
        </div>
        <h3 className="serif text-[1.45rem] leading-tight text-ink">{event.title}</h3>
        <div className="mt-auto flex flex-col gap-1.5 text-[13px] text-muted">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-3.5 shrink-0" />
            <LocalTime iso={event.starts_at} options={DATE_TIME} />
          </span>
          {event.location_name && (
            <span className="flex items-center gap-2 truncate">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{event.location_name}</span>
            </span>
          )}
          {event.capacity && (
            <span className="flex items-center gap-2">
              <Users className="size-3.5 shrink-0" /> Up to {event.capacity} guests
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Compact row used on the dashboard. */
export function EventRowItem({ event, files }: { event: EventRow; files?: number }) {
  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-ink/[0.03] md:px-6"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{event.title}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted">
          <LocalTime iso={event.starts_at} options={DATE_TIME} />
          {event.location_name ? ` · ${event.location_name}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {typeof files === "number" && files > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted">
            <Paperclip className="size-3" /> {files}
          </span>
        )}
        <StatusBadge status={event.status} />
      </div>
    </Link>
  );
}
