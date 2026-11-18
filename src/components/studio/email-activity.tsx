"use client";

import { BellRing, CalendarCheck, Inbox, Send } from "lucide-react";
import type { NotificationLogRow } from "@/types/db";
import { LocalTime } from "@/components/ui/local-time";
import { Tooltip } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "motion/react";

const KIND = {
  scheduled: { icon: CalendarCheck, label: "Schedule confirmation", tint: "bg-accent-soft text-accent" },
  reminder: { icon: BellRing, label: "Post reminder", tint: "bg-warning-soft text-warning" },
  test: { icon: Send, label: "Test email", tint: "bg-ink/[0.06] text-ink-2" },
} as const satisfies Record<NotificationLogRow["kind"], { icon: typeof Send; label: string; tint: string }>;

export function EmailActivity({ log }: { log: NotificationLogRow[] }) {
  const reduce = useReducedMotion();
  const sent = log.filter((l) => l.status === "sent").length;
  return (
    <section
      aria-labelledby="email-activity-title"
      className="min-w-0 rounded-3xl border border-line bg-surface/80 p-5 shadow-soft backdrop-blur-xl backdrop-saturate-150 md:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="email-activity-title" className="text-[15px] font-semibold tracking-tight text-ink">
          Email activity
        </h3>
        {log.length > 0 && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-ink/[0.045] px-2 py-0.5 text-[11.5px] font-medium tabular text-muted">
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
        <ol className="relative -mx-2 mt-3 flex flex-col">
          <span aria-hidden className="absolute bottom-5 left-[1.625rem] top-5 w-px bg-gradient-to-b from-line via-line to-transparent" />
          {log.map((row, i) => {
            const kind = KIND[row.kind];
            const Icon = kind.icon;
            const failed = row.status === "failed";
            return (
              <motion.li
                key={row.id}
                initial={reduce ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 34, delay: reduce ? 0 : Math.min(i, 8) * 0.05 }}
                className="relative flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors duration-200 hover:bg-ink/[0.025]"
              >
                <span
                  className={cn(
                    "relative grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-surface",
                    kind.tint,
                  )}
                >
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
                      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-danger-soft px-2 py-1 text-[11.5px] font-medium text-danger focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <span className="size-1.5 rounded-full bg-danger" aria-hidden />
                      Failed
                    </span>
                  </Tooltip>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-success-soft px-2 py-1 text-[11.5px] font-medium text-success">
                    <span className="relative flex size-1.5" aria-hidden>
                      {i === 0 && <span className="absolute inset-0 animate-pulse-dot rounded-full bg-success motion-reduce:hidden" />}
                      <span className="relative size-1.5 rounded-full bg-success" />
                    </span>
                    Sent
                  </span>
                )}
              </motion.li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
