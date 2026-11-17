"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { NativeSelect, SearchInput } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { CATEGORY_LABELS, EVENT_CATEGORIES, EVENT_STATUSES, SORT_OPTIONS, STATUS_META } from "@/config/events";

/** Search + filter bar. State lives in the URL, so results are shareable and survive refresh. */
export function EventFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const [q, setQ] = React.useState(params.get("q") ?? "");

  const update = React.useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === "all" || (key === "sort" && value === "soonest")) next.delete(key);
        else next.set(key, value);
      }
      next.delete("page"); // any filter change returns to page 1
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  // Debounce typing so we don't query on every keystroke.
  React.useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const id = window.setTimeout(() => update({ q: q.trim() }), 350);
    return () => window.clearTimeout(id);
  }, [q, params, update]);

  const hasFilters = ["q", "status", "category", "when", "sort"].some((k) => params.has(k));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 md:flex-row md:items-center">
      <div className="relative md:flex-1">
        <SearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, venue or notes"
          aria-label="Search events"
          maxLength={100}
        />
        {pending && <Spinner className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:flex">
        <NativeSelect aria-label="Status" value={params.get("status") ?? "all"} onChange={(e) => update({ status: e.target.value })}>
          <option value="all">All statuses</option>
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Category" value={params.get("category") ?? "all"} onChange={(e) => update({ category: e.target.value })}>
          <option value="all">All categories</option>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="When" value={params.get("when") ?? "all"} onChange={(e) => update({ when: e.target.value })}>
          <option value="all">Any time</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </NativeSelect>
        <NativeSelect aria-label="Sort" value={params.get("sort") ?? "soonest"} onChange={(e) => update({ sort: e.target.value })}>
          {Object.entries(SORT_OPTIONS).map(([key, opt]) => (
            <option key={key} value={key}>
              {opt.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-ink-2 hover:bg-ink/5"
        >
          <X className="size-4" /> Clear
        </button>
      )}
    </div>
  );
}
