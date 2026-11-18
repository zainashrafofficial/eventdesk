"use client";

import * as React from "react";
import { CalendarClock, CloudUpload, FileText, Layers, Lightbulb, Sparkles } from "lucide-react";
import { AnimatePresence, MotionConfig, animate, motion, useReducedMotion, type Variants } from "motion/react";
import { toast } from "sonner";
import type { getStudioData } from "@/lib/data/posts";
import { cn } from "@/lib/utils";
import { PLATFORM_LABELS } from "@/types/db";
import { CaptionOptions } from "./caption-options";
import { DriveStatusCard } from "./drive-status";
import { EmailActivity } from "./email-activity";
import { Generator } from "./generator";
import { NotificationSettingsSheet } from "./notification-settings";
import { PostFeed } from "./post-feed";
import { ScheduleComposer } from "./schedule-composer";
import { useStudio } from "./use-studio";

export type StudioData = Awaited<ReturnType<typeof getStudioData>>;
export type DriveNotice = { status: "connected" } | { status: "error"; reason: string | null } | null;

const noopSubscribe = () => () => {};
function greetingFor(hour: number) {
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
/** Computed from the viewer's clock; the server snapshot avoids a hydration mismatch. */
function useGreeting() {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => greetingFor(new Date().getHours()),
    () => "Welcome back",
  );
}

const SPRING = { type: "spring", stiffness: 260, damping: 28, mass: 0.9 } as const;
const HEADLINE = "What are we posting today?".split(" ");

const headerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};
const wordVariants: Variants = {
  hidden: { opacity: 0, y: "0.35em", filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: SPRING },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: SPRING },
};
const statsVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } },
};
const tileVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING },
};

/** Animated count-up; server HTML carries the real number, the client animates into it. */
function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const from = React.useRef(0);
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const format = (v: number) => Math.round(v).toLocaleString("en-US");
    if (reduce) {
      node.textContent = format(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce]);
  return <span ref={ref}>{value.toLocaleString("en-US")}</span>;
}

const DRIVE_ERRORS: Record<string, string> = {
  access_denied: "You declined access in Google. Connect again whenever you're ready.",
  state: "The sign-in link expired. Please try connecting again.",
  not_configured: "Google Drive isn't configured on the server yet.",
};

export function Studio({ data, driveNotice }: { data: StudioData; driveNotice: DriveNotice }) {
  const studio = useStudio();
  const greeting = useGreeting();
  const composerRef = React.useRef<HTMLDivElement>(null);
  const noticeShown = React.useRef(false);

  // One-off toast after the Google Drive OAuth round-trip, then tidy the URL.
  React.useEffect(() => {
    if (!driveNotice || noticeShown.current) return;
    noticeShown.current = true;
    if (driveNotice.status === "connected") {
      toast.success("Google Drive connected", { description: "New posts will sync to your “Cadence Drafts” folder." });
    } else {
      const reason = driveNotice.reason ? (DRIVE_ERRORS[driveNotice.reason] ?? driveNotice.reason) : null;
      toast.error("Couldn't connect Google Drive", { description: reason ?? "Please try again." });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("drive");
    url.searchParams.delete("reason");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [driveNotice]);

  const activePlatform = studio.meta?.platform ?? studio.platform;
  const composerOpen = studio.selectedIndex !== null;

  function handleSelect(index: number) {
    const wasOpen = composerOpen;
    studio.select(index);
    if (!wasOpen) {
      window.setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }

  const stats = [
    { label: "Scheduled", value: data.stats.scheduled, icon: CalendarClock, tint: "bg-accent-soft text-accent" },
    { label: "Drafts", value: data.stats.drafts, icon: FileText, tint: "bg-warning-soft text-warning" },
    { label: "Synced to Drive", value: data.stats.synced, icon: CloudUpload, tint: "bg-success-soft text-success" },
    { label: "Total posts", value: data.stats.total, icon: Layers, tint: "bg-ink/[0.06] text-ink-2" },
  ];

  return (
    <MotionConfig reducedMotion="user">
    <div className="container-app pt-8 pb-16 sm:pt-12">
      {/* Header */}
      <motion.header
        variants={headerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="min-w-0">
          <motion.p variants={fadeUp} className="eyebrow inline-flex items-center gap-2" suppressHydrationWarning>
            <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" aria-hidden />
            {greeting}
          </motion.p>
          <h1 className="display mt-2.5 text-[2.25rem] text-balance text-ink sm:text-5xl lg:text-[3.5rem]">
            {HEADLINE.map((word, i) => (
              <React.Fragment key={`${word}-${i}`}>
                <motion.span variants={wordVariants} className="inline-block will-change-transform">
                  {word}
                </motion.span>
                {i < HEADLINE.length - 1 ? " " : null}
              </React.Fragment>
            ))}
          </h1>
          <motion.p variants={fadeUp} className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
            Describe it once. Cadence drafts the captions, files them in Drive and reminds you when it&apos;s time.
          </motion.p>
        </div>
        <motion.div variants={fadeUp} className="shrink-0">
          <NotificationSettingsSheet settings={data.settings} />
        </motion.div>
      </motion.header>

      {/* Stats: Apple-widget tiles */}
      <motion.ul
        variants={statsVariants}
        initial="hidden"
        animate="show"
        className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4"
        aria-label="Overview"
      >
        {stats.map((s) => (
          <motion.li
            key={s.label}
            variants={tileVariants}
            whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 26 } }}
            className="glass group relative flex min-w-0 flex-col justify-between gap-5 overflow-hidden rounded-[26px] border border-line p-4 shadow-soft transition-shadow duration-300 hover:shadow-lift sm:p-5"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/70 to-transparent dark:via-white/15"
            />
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-medium text-muted">{s.label}</span>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 sm:size-9",
                  s.tint,
                )}
              >
                <s.icon className="size-4" aria-hidden />
              </span>
            </span>
            <span className="block text-[28px] leading-none font-semibold tracking-[-0.04em] text-ink tabular sm:text-[34px]">
              <CountUp value={s.value} />
            </span>
          </motion.li>
        ))}
      </motion.ul>

      {/* Main grid */}
      <div className="mt-8 grid gap-8 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ ...SPRING, delay: 0.32 }}
          >
            <Generator studio={studio} />
          </motion.div>

          <CaptionOptions
            options={studio.options}
            loading={studio.loading}
            count={studio.count}
            platform={activePlatform}
            selectedIndex={studio.selectedIndex}
            onSelect={handleSelect}
          />

          <div ref={composerRef} className="-my-4 scroll-mt-20">
            <AnimatePresence initial={false}>
              {composerOpen && (
                <motion.div
                  key="composer"
                  initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: { height: { ...SPRING, stiffness: 220 }, opacity: { duration: 0.25, delay: 0.05 } },
                    transitionEnd: { overflow: "visible" },
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    overflow: "hidden",
                    transition: { height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.16 } },
                  }}
                >
                  <div className="py-4">
              <ScheduleComposer
                caption={studio.caption}
                onCaptionChange={studio.setCaption}
                hashtags={studio.hashtags}
                onHashtagsChange={studio.setHashtags}
                platform={activePlatform}
                tone={studio.meta?.tone ?? studio.tone}
                prompt={studio.meta?.prompt ?? (studio.prompt.trim() || null)}
                ownerEmail={data.settings.email}
                onSaved={studio.clearSelection}
                onCancel={studio.clearSelection}
              />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <section aria-labelledby="feed-title" className="flex min-w-0 flex-col gap-4 pt-2">
            {/* PostFeed renders its own visible header; keep a landmark label for screen readers. */}
            <h2 id="feed-title" className="sr-only">
              Your posts ({data.stats.total})
            </h2>
            <PostFeed posts={data.posts} driveConnected={data.drive.connected} />
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-20 lg:self-start" aria-label="Integrations">
          <DriveStatusCard drive={data.drive} />
          <EmailActivity log={data.log} />

          <div className="glass rounded-[26px] border border-line p-5 shadow-soft">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-accent">
                <Lightbulb className="size-4" aria-hidden />
              </span>
              <h3 className="text-[15px] font-semibold text-ink">Tips for better captions</h3>
            </div>
            <ul className="mt-4 flex flex-col gap-3 text-[13.5px] leading-relaxed text-ink-2">
              <li className="flex gap-2.5">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" aria-hidden />
                Mention the audience and one concrete detail: a price, date or place.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" aria-hidden />
                Switch the tone and regenerate to explore different voices.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" aria-hidden />
                Add task details so your reminder email carries the to-do list.
              </li>
            </ul>
            <div className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-xs text-muted">
              <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden />
              <span className="truncate">
                {studio.meta
                  ? `${studio.meta.model} · ${PLATFORM_LABELS[studio.meta.platform]} · ${studio.meta.remaining} left this minute`
                  : "Powered by Google Gemini · 10 generations a minute"}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
    </MotionConfig>
  );
}
