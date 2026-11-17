"use client";

import * as React from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudOff,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Moon,
  RotateCw,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/display";
import { describeWeather, type WeatherIcon as IconKey } from "@/lib/weather-codes";
import { cn } from "@/lib/utils";
import type { WeatherReport } from "@/lib/services/open-meteo";

const ICONS: Record<IconKey, React.ComponentType<{ className?: string }>> = {
  sun: Sun,
  moon: Moon,
  partly: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

export function WeatherIcon({ code, isDay = true, className }: { code: number; isDay?: boolean; className?: string }) {
  const Icon = ICONS[describeWeather(code, isDay).icon];
  return <Icon className={className} />;
}

const round = (n: number) => Math.round(n);

function dayLabel(date: string) {
  // Dates are venue-local calendar days; format them as UTC so they don't shift.
  return new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function longDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; report: WeatherReport };

/**
 * External API panel: fetches /api/weather (our protected route that calls Open-Meteo)
 * and renders loading, error-with-retry, and data states.
 */
export function WeatherPanel({ latitude, longitude, startsAt }: { latitude: number; longitude: number; startsAt: string }) {
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), at: startsAt });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ kind: "loading" });
    fetch(`/api/weather?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as WeatherReport & { error?: string };
        if (!res.ok) throw new Error(body.error ?? `Weather request failed (${res.status}).`);
        setState({ kind: "ready", report: body });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't load the forecast." });
      });
    return () => controller.abort();
  }, [latitude, longitude, startsAt, attempt]);

  return (
    <section aria-labelledby="weather-title" className="rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 id="weather-title" className="text-[15px] font-semibold text-ink">
            Weather at the venue
          </h2>
          <p className="text-[13px] text-muted">Live from the Open-Meteo forecast API</p>
        </div>
        {state.kind === "ready" && (
          <Button variant="ghost" size="icon-sm" aria-label="Refresh forecast" onClick={() => setAttempt((a) => a + 1)}>
            <RotateCw />
          </Button>
        )}
      </div>

      {state.kind === "loading" && (
        <div className="flex flex-col gap-4 p-5" aria-busy>
          <Skeleton className="h-24 rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 flex-1 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div role="alert" className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-danger-soft text-danger">
            <CloudOff className="size-5" />
          </span>
          <p className="font-medium text-ink">Forecast unavailable</p>
          <p className="max-w-xs text-sm text-muted">{state.message}</p>
          <Button variant="secondary" size="sm" onClick={() => setAttempt((a) => a + 1)}>
            <RotateCw /> Try again
          </Button>
        </div>
      )}

      {state.kind === "ready" && <WeatherBody report={state.report} />}
    </section>
  );
}

function WeatherBody({ report }: { report: WeatherReport }) {
  const { current, eventDay, eventDate, eventTiming, daily } = report;
  const now = describeWeather(current.code, current.isDay);
  const lastForecastDay = daily[daily.length - 1]?.date;

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Event day */}
      {eventTiming === "in-range" && eventDay && (
        <div className="flex items-center gap-4 rounded-xl bg-ink p-4 text-paper">
          <WeatherIcon code={eventDay.code} className="size-11 shrink-0" />
          <div className="min-w-0">
            <p className="eyebrow !text-paper/60">Event day · {longDate(eventDay.date)}</p>
            <p className="serif mt-1 text-2xl leading-tight">
              {describeWeather(eventDay.code).label}, {round(eventDay.max)}° / {round(eventDay.min)}°
            </p>
            <p className="mt-1 text-[13px] text-paper/70">
              {eventDay.precipChance != null ? `${eventDay.precipChance}% chance of rain · ` : ""}wind up to {round(eventDay.windMax)} km/h
            </p>
          </div>
        </div>
      )}
      {eventTiming === "too-far" && eventDate && (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink">
          The event on <strong>{longDate(eventDate)}</strong> is beyond the 16-day forecast window (last day{" "}
          {lastForecastDay ? longDate(lastForecastDay) : "n/a"}). Check back closer to the date.
        </p>
      )}
      {eventTiming === "past" && (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">This event has already happened. Showing current conditions.</p>
      )}

      {/* Current conditions */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <WeatherIcon code={current.code} isDay={current.isDay} className="size-9 text-warning" />
          <div>
            <p className="serif text-3xl leading-none text-ink tabular">{round(current.temperature)}°C</p>
            <p className="mt-1 text-[13px] text-muted">Now · {now.label}</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-[13px]">
          <div>
            <dt className="flex items-center gap-1 text-muted">
              <Thermometer className="size-3.5" /> Feels
            </dt>
            <dd className="font-medium text-ink tabular">{round(current.feelsLike)}°</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-muted">
              <Droplets className="size-3.5" /> Humidity
            </dt>
            <dd className="font-medium text-ink tabular">{round(current.humidity)}%</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-muted">
              <Wind className="size-3.5" /> Wind
            </dt>
            <dd className="font-medium text-ink tabular">{round(current.windSpeed)} km/h</dd>
          </div>
        </dl>
      </div>

      {/* 16-day strip */}
      <div>
        <p className="eyebrow mb-2">16-day outlook</p>
        <ol className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {daily.map((day) => {
            const isEvent = day.date === eventDate;
            return (
              <li
                key={day.date}
                title={describeWeather(day.code).label}
                className={cn(
                  "flex w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center text-xs",
                  isEvent ? "bg-ink text-paper" : "bg-surface-2 text-ink-2",
                )}
              >
                <span className={cn(isEvent ? "text-paper/70" : "text-muted")}>{dayLabel(day.date)}</span>
                <WeatherIcon code={day.code} className="size-5" />
                <span className="font-medium tabular">{round(day.max)}°</span>
                <span className={cn("tabular", isEvent ? "text-paper/60" : "text-faint")}>{round(day.min)}°</span>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="text-[11px] text-faint">Times in {report.timezone}. Weather data by Open-Meteo.com (CC BY 4.0).</p>
    </div>
  );
}
