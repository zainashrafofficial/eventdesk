"use client";

import * as React from "react";
import { CalendarClock, CloudUpload, FileText, Layers, Lightbulb, Sparkles } from "lucide-react";
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
    <div className="container-app pt-8 pb-24 sm:pt-12">
      {/* Header */}
      <header className="flex animate-fade-up flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow" suppressHydrationWarning>
            {greeting}
          </p>
          <h1 className="display mt-2 text-[2.25rem] text-balance text-ink sm:text-5xl lg:text-[3.5rem]">
            What are we posting today?
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
            Describe it once. Cadence drafts the captions, files them in Drive and reminds you when it's time.
          </p>
        </div>
        <div className="shrink-0">
          <NotificationSettingsSheet settings={data.settings} />
        </div>
      </header>

      {/* Stats */}
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4" aria-label="Overview">
        {stats.map((s, i) => (
          <li
            key={s.label}
            className="glass group flex animate-fade-up items-center gap-3.5 rounded-3xl border border-line p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-5"
            style={{ animationDelay: `${80 + i * 60}ms` }}
          >
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-105 sm:size-11", s.tint)}>
              <s.icon className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl leading-none font-semibold tracking-[-0.03em] text-ink tabular sm:text-[28px]">
                {s.value}
              </span>
              <span className="mt-1.5 block truncate text-[13px] text-muted">{s.label}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Main grid */}
      <div className="mt-8 grid gap-8 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
            <Generator studio={studio} />
          </div>

          <CaptionOptions
            options={studio.options}
            loading={studio.loading}
            count={studio.count}
            platform={activePlatform}
            selectedIndex={studio.selectedIndex}
            onSelect={handleSelect}
          />

          <div ref={composerRef} className="scroll-mt-24">
            {composerOpen && (
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
            )}
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

          <div className="glass rounded-3xl border border-line p-5 shadow-soft">
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
  );
}
