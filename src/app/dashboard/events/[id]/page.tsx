import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { LocalTime } from "@/components/ui/local-time";
import { AttachmentsPanel } from "@/components/events/attachments-panel";
import { CategoryBadge, DATE_TIME, EventCover, StatusBadge } from "@/components/events/event-bits";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { VenueMap } from "@/components/events/venue-map";
import { WeatherPanel } from "@/components/events/weather-panel";
import { requireUser } from "@/lib/auth/dal";
import { getEvent } from "@/lib/data/events";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getEvent(id);
  return { title: result?.event.title ?? "Event" };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const [user, result] = await Promise.all([requireUser(`/dashboard/events/${id}`), getEvent(id)]);
  if (!result) notFound();

  const { event, attachments } = result;
  const hasLocation = event.latitude != null && event.longitude != null;

  return (
    <div className="container-app pt-6 md:pt-8">
      <Link href="/dashboard/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> All events
      </Link>

      {/* Header */}
      <div className="mt-5 overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="aspect-[21/8] max-h-80 w-full overflow-hidden bg-surface-2">
          <EventCover event={event} />
        </div>
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} />
              <CategoryBadge category={event.category} />
            </div>
            <h1 className="display mt-4 text-[clamp(2.2rem,5vw,3.4rem)] text-ink">{event.title}</h1>
            <div className="mt-4 flex flex-col gap-1.5 text-sm text-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4" /> <LocalTime iso={event.starts_at} options={DATE_TIME} />
              </span>
              {event.location_name && (
                <span className="flex items-center gap-2">
                  <MapPin className="size-4" /> {event.location_name}
                </span>
              )}
              {event.capacity && (
                <span className="flex items-center gap-2">
                  <Users className="size-4" /> Up to {event.capacity} guests
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/dashboard/events/${event.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <DeleteEventButton id={event.id} title={event.title} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-5 md:p-6">
            <h2 className="text-[15px] font-semibold text-ink">About this event</h2>
            {event.description ? (
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{event.description}</p>
            ) : (
              <p className="mt-3 text-sm text-muted">No description yet.</p>
            )}
            <p className="mt-5 flex items-center gap-1.5 border-t border-line pt-4 text-xs text-muted">
              <Clock className="size-3.5" /> Last updated <LocalTime iso={event.updated_at} relative />
            </p>
          </Card>
          <AttachmentsPanel eventId={event.id} userId={user.id} attachments={attachments} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {hasLocation ? (
            <>
              <WeatherPanel latitude={event.latitude!} longitude={event.longitude!} startsAt={event.starts_at} />
              <VenueMap latitude={event.latitude!} longitude={event.longitude!} name={event.location_name} />
            </>
          ) : (
            <Card className="p-6 text-center">
              <MapPin className="mx-auto size-6 text-muted" />
              <p className="mt-3 font-medium text-ink">No venue set</p>
              <p className="mt-1 text-sm text-muted">Add a venue to see the map and the weather forecast.</p>
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <Link href={`/dashboard/events/${event.id}/edit`}>Add a venue</Link>
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
