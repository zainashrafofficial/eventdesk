import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { PageHeader } from "@/components/ui/page-header";
import { EventCard } from "@/components/events/event-bits";
import { EventFilters } from "@/components/events/event-filters";
import { Pagination } from "@/components/events/pagination";
import { listEvents } from "@/lib/data/events";
import { eventFiltersSchema } from "@/lib/validation/event";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters = eventFiltersSchema.parse(sp);
  const { events, total, pageCount } = await listEvents(filters);
  const filtered = Boolean(filters.q) || filters.status !== "all" || filters.category !== "all" || filters.when !== "all";

  return (
    <div className="container-app">
      <PageHeader
        eyebrow="Events"
        title="All events"
        description={`${total} ${total === 1 ? "event" : "events"}${filtered ? " match your filters" : " in your workspace"}.`}
        actions={
          <Button asChild>
            <Link href="/dashboard/events/new">
              <Plus /> New event
            </Link>
          </Button>
        }
      />

      <EventFilters />

      {events.length === 0 ? (
        filtered ? (
          <EmptyState
            className="mt-8"
            icon={<SearchX />}
            title="No matches"
            description="Try a different search or clear the filters."
            action={
              <Button asChild variant="secondary">
                <Link href="/dashboard/events">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            className="mt-8"
            icon={<CalendarDays />}
            title="No events yet"
            description="Your events will appear here."
            action={
              <Button asChild>
                <Link href="/dashboard/events/new">
                  <Plus /> Create an event
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      <Pagination page={Math.min(filters.page, pageCount)} pageCount={pageCount} searchParams={sp} />
    </div>
  );
}
