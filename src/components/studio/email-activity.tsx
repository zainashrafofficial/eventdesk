"use client";

import { BellRing, CalendarCheck, Inbox, Send } from "lucide-react";
import type { NotificationLogRow } from "@/types/db";
import { LocalTime } from "@/components/ui/local-time";
import { Tooltip } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";

const KIND = {
  scheduled: { icon: CalendarCheck, label: "Schedule confirmation", tint: "bg-accent-soft text-accent" },
  reminder: { icon: BellRing, label: "Post reminder", tint: "bg-warning-soft text-warning" },
  test: { icon: Send, label: "Test email", tint: "bg-ink/[0.06] text-ink-2" },
} as const satisfies Record<NotificationLogRow["kind"], { icon: typeof Send; label: string; tint: string }>;

export function EmailActivity({ log }: { log: NotificationLogRow[] }) {
  const sent = log.filter((l) => l.status === "sent").length;
  return (
    <section
      aria-labelledby="email-activity-title"
      className="rounded-3xl border border-line bg-surface/80 p-5 shadow-soft backdrop-blur-xl md:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="email-activity-title" className="text-[15px] font-semibold tracking-tight text-ink">
          Email activity
        </h3>
        {log.length > 0 && (
          <span className="text-[12px] tabular text-muted">
            {sent} of {log.length} delivered
          </span>
        )}
      </div>

      {log.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted ring-1 ring-line">
            <Inbox className="size-4" />
          </span>
          <p className="mt-3 text-[14px] font-medium text-ink">No emails yet</p>
          <p className="mt-1 max-w-56 text-[12.5px] leading-relaxed text-muted">
            Confirmations and reminders appear here once you schedule a post.
          </p>
        </div>
      ) : (
        <ol className="-mx-2 mt-3 flex flex-col">
          {log.map((row, i) => {
            const kind = KIND[row.kind];
            const Icon = kind.icon;
            const failed = row.status === "failed";
            return (
              <li
                key={row.id}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="flex animate-fade-up items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors duration-200 hover:bg-ink/[0.025]"
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", kind.tint)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">{kind.label}</p>
                  <p className="truncate text-[12px] text-muted">
                    {row.sent_to} · <LocalTime iso={row.created_at} relative />
                  </p>
                </div>
                {failed ? (
                  <Tooltip content={row.error ?? "Delivery failed"}>
                    <span
                      tabIndex={0}
                      className="flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1 text-[11.5px] font-medium text-danger focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <span className="size-2 rounded-full bg-danger" aria-hidden />
                      Failed
                    </span>
                  </Tooltip>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 px-1.5 text-[11.5px] font-medium text-success">
                    <span className="size-2 rounded-full bg-success" aria-hidden />
                    Sent
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
