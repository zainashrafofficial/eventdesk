"use client";

import { motion, useInView, type Variants } from "motion/react";
import { BellRing, CalendarClock, CloudUpload, Gauge, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, SPRING_SOFT } from "./motion-primitives";

const grid: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const tile: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, ease: EASE_OUT_EXPO } },
};

function Tile({
  icon: Icon,
  eyebrow,
  title,
  body,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.article
      variants={tile}
      whileHover={{ y: -3 }}
      transition={SPRING_SOFT}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-soft transition-shadow duration-300 hover:shadow-lift sm:p-7",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-accent">
          <Icon className="size-4" />
        </span>
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.022em] text-ink sm:text-[21px]">{title}</h3>
      <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-muted">{body}</p>
      <div aria-hidden className="relative mt-6 flex flex-1 items-end">
        {children}
      </div>
    </motion.article>
  );
}

function GeminiArt({ on }: { on: boolean }) {
  const lines = [
    { w: "92%", tag: "#specialtycoffee" },
    { w: "78%", tag: "#newroast" },
    { w: "86%", tag: "#slowmornings" },
  ];
  return (
    <div className="bg-dots relative w-full rounded-2xl border border-line bg-paper p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[12px] font-medium text-muted">
        <Sparkles className="size-3.5 text-accent" /> 3 options · Instagram · Warm
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        {lines.map((l, i) => (
          <motion.div
            key={l.tag}
            initial={{ opacity: 0, x: -16 }}
            animate={on ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
            transition={{ ...SPRING_SOFT, delay: 0.35 + i * 0.12 }}
            className={cn(
              "rounded-xl border bg-surface p-3",
              i === 0 ? "border-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_12%,transparent)]" : "border-line",
            )}
          >
            <div className="h-2 rounded-full bg-surface-3" style={{ width: l.w }} />
            <div className="mt-1.5 h-2 w-1/2 rounded-full bg-surface-3" />
            <p className="mt-2 text-[11px] font-medium text-accent">{l.tag}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DriveArt({ on }: { on: boolean }) {
  return (
    <div className="relative w-full">
      <div className="rounded-2xl border border-line bg-paper p-3">
        <div className="flex items-center gap-2 px-1 text-[12px] font-medium text-ink-2">
          <span className="h-3 w-4 rounded-[3px] bg-warning/70" /> Cadence Drafts
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ ...SPRING_SOFT, delay: 0.3 + i * 0.1 }}
              className="aspect-[3/4] rounded-lg border border-line bg-surface p-1.5"
            >
              <div className="h-1 w-3/4 rounded-full bg-accent/60" />
              <div className="mt-1 h-1 w-full rounded-full bg-surface-3" />
              <div className="mt-1 h-1 w-2/3 rounded-full bg-surface-3" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarArt({ on }: { on: boolean }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="w-full rounded-2xl border border-line bg-paper p-3">
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-faint">
        {days.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="relative aspect-square rounded-md bg-surface ring-1 ring-line">
            {i === 3 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={on ? { scale: 1 } : { scale: 0 }}
                transition={{ ...SPRING_SOFT, delay: 0.5 }}
                className="absolute inset-0 grid place-items-center rounded-md bg-accent text-[9px] font-semibold text-accent-ink"
              >
                6PM
              </motion.span>
            )}
            {(i === 5 || i === 7) && <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent/60" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailArt({ on }: { on: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, rotate: -2 }}
      animate={on ? { opacity: 1, y: 0, rotate: 0 } : { opacity: 0, y: 14, rotate: -2 }}
      transition={{ ...SPRING_SOFT, delay: 0.4 }}
      className="w-full rounded-2xl border border-line bg-paper p-3.5"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success-soft text-success">
          <BellRing className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-ink">Reminder: goes live in 1 hour</p>
          <p className="truncate text-[11.5px] text-muted">Ethiopia roast launch · Thu 6:00 PM</p>
        </div>
      </div>
    </motion.div>
  );
}

function RlsArt({ on }: { on: boolean }) {
  return (
    <div className="w-full rounded-2xl border border-line bg-paper p-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={on ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5",
            i === 0 ? "bg-surface ring-1 ring-line" : "blur-[2px]",
          )}
        >
          <span className={cn("size-2 rounded-full", i === 0 ? "bg-success" : "bg-faint")} />
          <span className={cn("h-1.5 flex-1 rounded-full", i === 0 ? "bg-surface-3" : "bg-line")} />
          {i === 0 ? <ShieldCheck className="size-3.5 text-success" /> : <Lock className="size-3 text-faint" />}
        </motion.div>
      ))}
    </div>
  );
}

function RateArt({ on }: { on: boolean }) {
  const bars = [0.35, 0.55, 0.4, 0.7, 0.9, 1, 0.6, 0.45, 0.3, 0.5];
  return (
    <div className="w-full rounded-2xl border border-line bg-paper p-3">
      <div className="flex h-16 items-end gap-1">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            initial={{ scaleY: 0 }}
            animate={on ? { scaleY: h } : { scaleY: 0 }}
            transition={{ ...SPRING_SOFT, delay: 0.3 + i * 0.04 }}
            className={cn("h-full flex-1 origin-bottom rounded-sm", h >= 0.9 ? "bg-warning" : "bg-accent/70")}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10.5px] font-medium text-muted">
        <span>generate</span>
        <span className="tabular">10 / 60s</span>
      </div>
    </div>
  );
}

/** Apple-style bento grid of features with scroll-triggered reveals. */
export function BentoGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      variants={grid}
      initial="hidden"
      animate={on ? "visible" : "hidden"}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"
    >
      <Tile
        icon={Sparkles}
        eyebrow="Google Gemini"
        title="Three captions from one sentence."
        body="Describe the post. Gemini returns distinct, on-brand options with hashtags tuned to each platform's limits."
        className="sm:col-span-2 lg:col-span-4 lg:row-span-2"
      >
        <GeminiArt on={on} />
      </Tile>
      <Tile
        icon={CloudUpload}
        eyebrow="Google Drive"
        title="Every draft, in your Drive."
        body="Saved as a Google Doc in your own Cadence Drafts folder."
        className="lg:col-span-2"
      >
        <DriveArt on={on} />
      </Tile>
      <Tile
        icon={CalendarClock}
        eyebrow="Scheduling"
        title="The right moment."
        body="Pick a time; your queue stays in order."
        className="lg:col-span-2"
      >
        <CalendarArt on={on} />
      </Tile>
      <Tile
        icon={BellRing}
        eyebrow="Resend email"
        title="Reminders before go-live."
        body="A confirmation on schedule, a nudge before it posts."
        className="lg:col-span-2"
      >
        <EmailArt on={on} />
      </Tile>
      <Tile
        icon={ShieldCheck}
        eyebrow="Row-Level Security"
        title="Your posts are yours."
        body="Postgres RLS means every query only ever sees your rows."
        className="lg:col-span-2"
      >
        <RlsArt on={on} />
      </Tile>
      <Tile
        icon={Gauge}
        eyebrow="Rate limiting"
        title="Fair use, built in."
        body="Per-user limits on AI calls, writes and email."
        className="sm:col-span-2 lg:col-span-2"
      >
        <RateArt on={on} />
      </Tile>
    </motion.div>
  );
}
