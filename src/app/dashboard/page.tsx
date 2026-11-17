import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarClock, CalendarDays, MapPin, Paperclip, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, Stat } from "@/components/ui/display";
import { LocalTime } from "@/components/ui/local-time";
import { PageHeader } from "@/components/ui/page-header";
import { FormAlert } from "@/components/ui/form-alert";
import { DATE_TIME, EventCover, EventRowItem, StatusBadge } from "@/components/events/event-bits";
import { WeatherPanel } from "@/components/events/weather-panel";
import { EVENT_STATUSES, STATUS_META } from "@/config/events";
import { requireUser } from "@/lib/auth/dal";
import { getDashboard } from "@/lib/data/events";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [user, data, sp] = await Promise.all([requireUser(), getDashboard(), searchParams]);
  const next = data.nextUp[0];
  const firstName = user.fullName.split(" ")[0];
  const maxStatus = Math.max(1, ...EVENT_STATUSES.map((s) => data.statusCounts[s]));

  return (
    <div className="container-app">
      <PageHeader
        eyebrow="Overview"
        title={<>Hello, {firstName}.</>}
        description="Here's what's coming up across your events."
        actions={
          <Button asChild>
            <Link href="/dashboard/events/new">
              <Plus /> New event
            </Link>
          </Button>
        }
      />

      {sp.welcome === "1" && (
        <FormAlert tone="success" className="mb-6" message="Your account is ready. Create your first event to get started." />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total events" value={data.totals.events} icon={<CalendarDays />} />
        <Stat label="Upcoming" value={data.totals.upcoming} icon={<CalendarClock />} />
        <Stat label="Completed" value={data.totals.completed} icon={<CalendarCheck />} />
        <Stat label="Files stored" value={data.totals.files} icon={<Paperclip />} />
      </div>

      {data.totals.events === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<CalendarDays />}
          title="No events yet"
          description="Create your first event: add a venue to unlock the map and weather forecast, then attach files."
          action={
            <Button asChild>
              <Link href="/dashboard/events/new">
                <Plus /> Create an event
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex min-w-0 flex-col gap-6">
            {/* Next event spotlight */}
            {next ? (
              <Card className="overflow-hidden">
                <div className="grid sm:grid-cols-[14rem_1fr]">
                  <div className="aspect-[16/9] bg-surface-2 sm:aspect-auto">
                    <EventCover event={next} />
                  </div>
                  <div className="flex flex-col gap-3 p-5 md:p-6">
                    <span className="eyebrow">Next up</span>
                    <h2 className="serif text-[1.75rem] leading-tight text-ink">{next.title}</h2>
                    <div className="flex flex-col gap-1 text-sm text-muted">
                      <span className="flex items-center gap-2">
                        <CalendarDays className="size-4" /> <LocalTime iso={next.starts_at} options={DATE_TIME} />
                      </span>
                      {next.location_name && (
                        <span className="flex items-center gap-2">
                          <MapPin className="size-4" /> {next.location_name}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                      <StatusBadge status={next.status} />
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/dashboard/events/${next.id}`}>
                          Open <ArrowRight />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <EmptyState icon={<CalendarClock />} title="Nothing scheduled" description="All your events are in the past or cancelled." />
            )}

            <Card>
              <CardHeader
                title="Recently added"
                action={
                  <Link href="/dashboard/events?sort=newest" className="text-sm font-medium text-ink-2 hover:text-ink">
                    View all
                  </Link>
                }
              />
              <div className="divide-y divide-line">
                {data.recent.map((event) => (
                  <EventRowItem key={event.id} event={event} />
                ))}
              </div>
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            {next?.latitude != null && next.longitude != null ? (
              <WeatherPanel latitude={next.latitude} longitude={next.longitude} startsAt={next.starts_at} />
            ) : (
              <Card className="p-5">
                <p className="text-[15px] font-semibold text-ink">Weather at the venue</p>
                <p className="mt-1 text-sm text-muted">Add a venue to your next event to see its forecast here.</p>
              </Card>
            )}

            <Card>
              <CardHeader title="By status" description="How your events break down" />
              <ul className="flex flex-col gap-3 p-5">
                {EVENT_STATUSES.map((s) => (
                  <li key={s}>
                    <Link href={`/dashboard/events?status=${s}`} className="group block">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-ink-2 group-hover:text-ink">{STATUS_META[s].label}</span>
                        <span className="font-medium text-ink tabular">{data.statusCounts[s]}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                        <div
                          className="h-full rounded-full bg-ink transition-[width] duration-700"
                          style={{ width: `${(data.statusCounts[s] / maxStatus) * 100}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
