"use client";

import * as React from "react";

/**
 * Renders a timestamp in the viewer's own locale/time zone.
 * Server HTML shows a deterministic UTC rendering; the client swaps in local time after hydration.
 */
export function LocalTime({
  iso,
  options = { month: "short", day: "numeric", year: "numeric" },
  relative = false,
  className,
}: {
  iso: string | null | undefined;
  options?: Intl.DateTimeFormatOptions;
  relative?: boolean;
  className?: string;
}) {
  const [text, setText] = React.useState(() =>
    iso ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(new Date(iso)) : "—",
  );

  React.useEffect(() => {
    if (!iso) return;
    const update = () => setText(relative ? relativeTime(iso) : new Intl.DateTimeFormat(undefined, options).format(new Date(iso)));
    update();
    if (!relative) return;
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso, relative]);

  return (
    <time dateTime={iso ?? undefined} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}

export function relativeTime(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return "just now";
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), "day");
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}
