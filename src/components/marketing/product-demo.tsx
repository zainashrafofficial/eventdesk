"use client";

import { AnimatePresence, motion, useInView, useReducedMotion, type Variants } from "motion/react";
import { CalendarClock, Check, CloudUpload, Mail, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, SPRING_SNAPPY, SPRING_SOFT } from "./motion-primitives";

const PROMPT = "Launching our new Ethiopian single-origin roast this Thursday morning";

const OPTIONS = [
  {
    text: "Golden hour, fresh roast, zero rush. Our new Ethiopia single-origin lands Thursday. Come taste the sunrise.",
    tags: ["#specialtycoffee", "#newroast", "#slowmornings"],
  },
  {
    text: "Notes of blueberry and jasmine in every cup. The Yirgacheffe drop is almost here. Set your alarm.",
    tags: ["#coffeelover", "#singleorigin"],
  },
  {
    text: "We roasted 40 kilos so you don't have to wait. Thursday, 7 AM, first pour on us.",
    tags: ["#localroasters", "#morningritual"],
  },
];

/* Timeline (ms) for one ~9s loop. */
const LOOP = 9000;
const TICK = 40;
const TYPE_START = 300;
const CHAR_MS = 30;
const TYPE_END = TYPE_START + PROMPT.length * CHAR_MS;
const GEN_START = TYPE_END + 200;
const CARDS_AT = GEN_START + 1300;
const SELECT_AT = CARDS_AT + 1200;
const SCHEDULE_AT = SELECT_AT + 900;
const DRIVE_AT = SCHEDULE_AT + 450;
const EMAIL_AT = DRIVE_AT + 350;

const list: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};
const card: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: SPRING_SOFT },
};

function Pop({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.6, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
          transition={SPRING_SNAPPY}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink-2 shadow-soft [&_svg]:size-3.5"
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Self-playing Studio demo: types a prompt, "generates", picks a caption and schedules it. Loops. */
export function ProductDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setInterval(() => setElapsed((t) => (t + TICK) % LOOP), TICK);
    return () => window.clearInterval(id);
  }, [inView, reduce]);

  // Reduced motion: show the finished state, no loop.
  const t = reduce ? LOOP - 1 : elapsed;
  const typed = Math.max(0, Math.min(PROMPT.length, Math.floor((t - TYPE_START) / CHAR_MS)));
  const generating = t >= GEN_START && t < CARDS_AT;
  const showCards = t >= CARDS_AT;
  const selected = t >= SELECT_AT;
  const scheduled = t >= SCHEDULE_AT;
  const typingDone = typed >= PROMPT.length;

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-5xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 -bottom-12 top-24 rounded-[48px] bg-accent/20 blur-3xl sm:inset-x-16"
      />
      <div
        role="img"
        aria-label="Animated demo of the Cadence Studio: a prompt is typed, Gemini returns three captions, one is selected and scheduled with Google Drive sync and an email reminder."
        className="relative overflow-hidden rounded-[22px] border border-line bg-surface shadow-overlay sm:rounded-[28px]"
      >
        {/* macOS-style glass toolbar */}
        <div className="glass relative flex h-11 items-center gap-2 border-b border-line px-4 sm:px-5">
          <span className="size-3 rounded-full bg-[#ff5f57] ring-1 ring-black/5" />
          <span className="size-3 rounded-full bg-[#febc2e] ring-1 ring-black/5" />
          <span className="size-3 rounded-full bg-[#28c840] ring-1 ring-black/5" />
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-lg bg-surface-2 p-0.5 text-[11px] font-medium text-muted ring-1 ring-line sm:flex">
            <span className="rounded-md bg-surface px-2.5 py-1 text-ink shadow-soft">Studio</span>
            <span className="px-2.5 py-1">Queue</span>
            <span className="px-2.5 py-1">Drive</span>
          </div>
          <span className="ml-auto text-[11px] font-medium text-faint">cadence.app</span>
        </div>

        <div className="grid gap-5 bg-paper/40 p-4 sm:p-7 lg:grid-cols-[1.4fr_1fr] lg:gap-7">
          <div className="min-w-0">
            {/* Prompt */}
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <span className="eyebrow">Describe your post</span>
                <span className="text-[11px] font-medium text-faint">Instagram · Warm</span>
              </div>
              <p className="mt-2 min-h-[3.25rem] text-[15px] leading-relaxed text-ink sm:min-h-[1.75rem]">
                {PROMPT.slice(0, typed)}
                {!typingDone && (
                  <span aria-hidden className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-caret bg-accent" />
                )}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-2 ring-1 ring-line">
                    3 options
                  </span>
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-2 ring-1 ring-line">
                    Hashtags
                  </span>
                </div>
                <motion.span
                  animate={generating ? { scale: [1, 0.94, 1] } : { scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-medium text-accent-ink"
                >
                  <Sparkles className={cn("size-3.5", generating && "animate-pulse")} />
                  {generating ? "Generating…" : "Generate"}
                </motion.span>
              </div>
            </div>

            {/* Results */}
            <div className="relative mt-4 min-h-[19rem] sm:min-h-[17.5rem]">
              <AnimatePresence mode="wait">
                {generating && (
                  <motion.div
                    key="gen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    className="flex flex-col gap-2.5"
                  >
                    <p className="text-shimmer flex items-center gap-1.5 text-[13px] font-medium">Gemini is writing three options…</p>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="rounded-2xl border border-line bg-surface p-4">
                        <div className="skeleton h-3 w-11/12" />
                        <div className="skeleton mt-2 h-3 w-8/12" />
                        <div className="skeleton mt-3 h-2.5 w-4/12" />
                      </div>
                    ))}
                  </motion.div>
                )}
                {showCards && (
                  <motion.ul key="cards" variants={list} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-2.5">
                    {OPTIONS.map((o, i) => {
                      const isSel = selected && i === 0;
                      return (
                        <motion.li
                          key={o.text}
                          variants={card}
                          className={cn(
                            "relative rounded-2xl border bg-surface p-4 transition-[border-color,background-color,box-shadow] duration-500",
                            isSel ? "border-accent bg-accent-soft/50 shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_14%,transparent)]" : "border-line",
                            i === 2 && "hidden sm:block",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                                isSel ? "border-accent bg-accent text-accent-ink" : "border-line-strong",
                              )}
                            >
                              <AnimatePresence>
                                {isSel && (
                                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_SNAPPY}>
                                    <Check className="size-3" strokeWidth={3} />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13.5px] leading-relaxed text-ink">{o.text}</p>
                              <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs font-medium text-accent">
                                {o.tags.map((tag) => (
                                  <span key={tag}>{tag}</span>
                                ))}
                              </p>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Schedule panel */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <span className="eyebrow">Schedule</span>
              <div className="mt-3 flex min-h-11 items-center gap-3">
                <AnimatePresence mode="wait">
                  {scheduled ? (
                    <motion.div
                      key="on"
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      transition={SPRING_SOFT}
                      className="flex items-center gap-3"
                    >
                      <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-ink shadow-soft">
                        <CalendarClock className="size-5" />
                      </span>
                      <div>
                        <p className="text-[17px] font-semibold tracking-[-0.02em] text-ink">Thu 6:00 PM</p>
                        <p className="text-xs text-muted">Nov 20 · Instagram</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-faint ring-1 ring-line">
                        <CalendarClock className="size-5" />
                      </span>
                      <p className="text-sm text-faint">Pick a caption to schedule</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="mt-5 flex min-h-16 flex-wrap content-start gap-2">
                <Pop show={t >= DRIVE_AT}>
                  <CloudUpload className="text-accent" /> Synced to Google Drive
                </Pop>
                <Pop show={t >= EMAIL_AT}>
                  <Mail className="text-success" /> Email reminder set
                </Pop>
              </div>
              <motion.span
                animate={scheduled ? { opacity: 1 } : { opacity: 0.45 }}
                className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-medium text-accent-ink"
              >
                {scheduled ? (
                  <>
                    <Check className="size-4" strokeWidth={2.5} /> Scheduled
                  </>
                ) : (
                  "Schedule post"
                )}
              </motion.span>
            </div>

            <div className="hidden rounded-2xl border border-line bg-surface p-5 sm:block">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Up next</span>
                <span className="tabular text-[11px] font-medium text-faint">{scheduled ? 3 : 2} scheduled</span>
              </div>
              <ul className="mt-3 flex flex-col divide-y divide-line">
                <AnimatePresence initial={false}>
                  {scheduled && (
                    <motion.li
                      key="new"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.2 }}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <span className="w-9 text-xs font-semibold text-accent">Thu</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">Ethiopia roast launch</span>
                      <span className="tabular text-xs text-muted">6:00 PM</span>
                    </motion.li>
                  )}
                </AnimatePresence>
                {[
                  { day: "Sat", time: "9:30 AM", label: "Weekend brunch menu" },
                  { day: "Mon", time: "8:00 AM", label: "Barista of the month" },
                ].map((p) => (
                  <li key={p.label} className="flex items-center gap-3 py-2.5">
                    <span className="w-9 text-xs font-semibold text-ink">{p.day}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{p.label}</span>
                    <span className="tabular text-xs text-muted">{p.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
