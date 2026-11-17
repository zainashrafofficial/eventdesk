"use client";

import * as React from "react";
import { Loader2, MapPin, RotateCw, X } from "lucide-react";
import { fieldControl } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PickedLocation = { name: string; latitude: number; longitude: number };
type Place = { id: number; label: string; latitude: number; longitude: number };

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; places: Place[] };

/**
 * Venue picker backed by the Open-Meteo Geocoding API (via our protected /api/geocode).
 * Debounced, cancellable, keyboard accessible, with loading / empty / error states.
 */
export function LocationSearch({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  value: PickedLocation | null;
  onChange: (value: PickedLocation | null) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [state, setState] = React.useState<State>({ kind: "idle" });
  const [active, setActive] = React.useState(0);
  const [attempt, setAttempt] = React.useState(0);
  const listId = `${id}-results`;

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // too short: rendered as idle below, no request
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState({ kind: "loading" });
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = (await res.json().catch(() => ({}))) as { places?: Place[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Location search failed.");
        setActive(0);
        setState({ kind: "done", places: body.places ?? [] });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({ kind: "error", message: err instanceof Error ? err.message : "Location search failed." });
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, attempt]);

  const pick = (place: Place) => {
    onChange({ name: place.label, latitude: place.latitude, longitude: place.longitude });
    setQuery("");
    setState({ kind: "idle" });
  };

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <MapPin className="size-4 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{value.name}</p>
            <p className="font-mono text-[11px] text-muted">
              {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium text-ink-2 hover:bg-ink/5"
        >
          <X className="size-3.5" /> Change
        </button>
      </div>
    );
  }

  const view: State = query.trim().length < 2 ? { kind: "idle" } : state;
  const places = view.kind === "done" ? view.places : [];
  const open = view.kind !== "idle";

  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted" />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-activedescendant={places[active] ? `${listId}-${places[active].id}` : undefined}
        autoComplete="off"
        placeholder="Search a city, e.g. Lahore"
        className={cn(fieldControl, "h-11 pl-10")}
        value={query}
        maxLength={100}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (!places.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % places.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + places.length) % places.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(places[active]);
          } else if (e.key === "Escape") {
            setState({ kind: "idle" });
          }
        }}
      />
      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-overlay"
        >
          {view.kind === "loading" && (
            <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" /> Searching places…
            </p>
          )}
          {view.kind === "error" && (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-danger" role="alert">
              <span>{view.message}</span>
              <button
                type="button"
                onClick={() => setAttempt((a) => a + 1)}
                className="inline-flex items-center gap-1 font-medium text-ink underline-offset-4 hover:underline"
              >
                <RotateCw className="size-3.5" /> Retry
              </button>
            </div>
          )}
          {view.kind === "done" && places.length === 0 && (
            <p className="px-3 py-2.5 text-sm text-muted">No places match “{query.trim()}”.</p>
          )}
          {places.map((place, i) => (
            <button
              key={place.id}
              id={`${listId}-${place.id}`}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(place)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm",
                i === active ? "bg-ink/[0.06] text-ink" : "text-ink-2",
              )}
            >
              <MapPin className="size-4 shrink-0 text-muted" />
              <span className="truncate">{place.label}</span>
            </button>
          ))}
          <p className="border-t border-line px-3 pb-1 pt-2 text-[11px] text-faint">Results from Open-Meteo Geocoding</p>
        </div>
      )}
    </div>
  );
}
