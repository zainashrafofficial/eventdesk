"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Search, Sparkles, X } from "lucide-react";
import type { PostRow } from "@/types/db";
import { fieldControl } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PostCard, effectiveStatus, useNow, type EffectiveStatus } from "@/components/studio/post-card";

type Filter = "all" | EffectiveStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
];

const PILL_SPRING = { type: "spring", stiffness: 520, damping: 40, mass: 0.8 } as const;
const CARD_SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const;

/** True shortly after mount, so the first list staggers in but later inserts don't wait. */
function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 600);
    return () => window.clearTimeout(id);
  }, []);
  return mounted;
}

type Group = { key: string; label: string; sub?: string; posts: PostRow[] };

/** Day key + label. On the server (now === 0) we use UTC so hydration is deterministic. */
function dayInfo(iso: string, now: number) {
  const client = now > 0;
  const tz = client ? undefined : "UTC";
  const locale = client ? undefined : "en-US";
  const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const key = keyFmt.format(new Date(iso));
  const ref = client ? now : new Date(iso).getTime();
  const today = keyFmt.format(new Date(ref));
  const tomorrow = keyFmt.format(new Date(ref + 86_400_000));
  const yesterday = keyFmt.format(new Date(ref - 86_400_000));
  const date = new Intl.DateTimeFormat(locale, { timeZone: tz, month: "short", day: "numeric" }).format(new Date(iso));
  const weekday = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long" }).format(new Date(iso));
  if (client && key === today) return { key, label: "Today", sub: date };
  if (client && key === tomorrow) return { key, label: "Tomorrow", sub: date };
  if (client && key === yesterday) return { key, label: "Yesterday", sub: date };
  return { key, label: weekday, sub: date };
}

function groupPosts(posts: PostRow[], now: number): Group[] {
  const groups = new Map<string, Group>();
  const drafts: PostRow[] = [];
  const sorted = [...posts].sort((a, b) => {
    if (!a.scheduled_at || !b.scheduled_at) return a.scheduled_at ? -1 : b.scheduled_at ? 1 : 0;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });
  for (const post of sorted) {
    if (post.status === "draft" || !post.scheduled_at) {
      drafts.push(post);
      continue;
    }
    const info = dayInfo(post.scheduled_at, now);
    const g = groups.get(info.key) ?? { ...info, posts: [] };
    g.posts.push(post);
    groups.set(info.key, g);
  }
  const out = [...groups.values()];
  if (drafts.length) {
    drafts.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    out.push({ key: "drafts", label: "Drafts", sub: `${drafts.length}`, posts: drafts });
  }
  return out;
}

function matches(post: PostRow, q: string) {
  if (!q) return true;
  const hay = `${post.caption} ${post.hashtags.map((t) => `#${t}`).join(" ")} ${post.notes ?? ""}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

export function PostFeed({ posts, driveConnected }: { posts: PostRow[]; driveConnected: boolean }) {
  const now = useNow();
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query.trim());

  const counts = React.useMemo(() => {
    const c: Record<Filter, number> = { all: posts.length, scheduled: 0, draft: 0, published: 0 };
    for (const p of posts) c[effectiveStatus(p, now)] += 1;
    return c;
  }, [posts, now]);

  const visible = React.useMemo(
    () => posts.filter((p) => (filter === "all" || effectiveStatus(p, now) === filter) && matches(p, deferredQuery)),
    [posts, filter, deferredQuery, now],
  );

  const groups = React.useMemo(() => {
    const g = groupPosts(visible, now);
    // Published posts read best newest-first.
    if (filter === "published") g.reverse();
    return g;
  }, [visible, now, filter]);

  return (
    <section aria-labelledby="feed-title" className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Your queue</p>
          <h2 id="feed-title" className="mt-1.5 text-2xl font-semibold tracking-tight text-ink md:text-[1.75rem]">
            Posts
          </h2>
        </div>
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search captions, hashtags, notes"
            aria-label="Search posts"
            className={cn(fieldControl, "h-10 rounded-full bg-surface/80 pl-10 pr-10 backdrop-blur-xl [&::-webkit-search-cancel-button]:hidden")}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Segmented control with a spring-driven sliding pill */}
      <LayoutGroup id="feed-filter">
        <div role="tablist" aria-label="Filter posts" className="no-scrollbar -mx-1 flex overflow-x-auto px-1 py-0.5">
          <div className="inline-flex shrink-0 gap-0.5 rounded-full border border-line bg-ink/[0.035] p-1">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "relative inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium",
                    "touch-manipulation transition-colors duration-200 ease-out",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                    active ? "text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="feed-filter-pill"
                      aria-hidden
                      transition={reduce ? { duration: 0 } : PILL_SPRING}
                      style={{ borderRadius: 999 }}
                      className="absolute inset-0 bg-surface shadow-soft ring-1 ring-line"
                    />
                  )}
                  <span className="relative">{f.label}</span>
                  <span
                    className={cn(
                      "relative min-w-5 rounded-full px-1.5 text-center text-[11px] tabular leading-5 transition-colors duration-200",
                      active ? "bg-ink/[0.07] text-ink-2" : "text-faint",
                    )}
                  >
                    {counts[f.value]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </LayoutGroup>

      {posts.length === 0 ? (
        <FeedEmpty
          kind="new"
          title="No posts yet"
          description="Generate your first caption above, pick a time, and it lands here, synced to Drive with an email reminder."
        />
      ) : groups.length === 0 ? (
        <FeedEmpty
          kind="search"
          title={deferredQuery ? "No matches" : "Nothing here yet"}
          description={
            deferredQuery
              ? `No posts match “${deferredQuery}”. Try a different word or hashtag.`
              : "Posts in this view will show up here."
          }
        />
      ) : (
        <div className="relative flex flex-col gap-8">
          <AnimatePresence initial={false} mode="popLayout">
            {groups.map((group) => (
              <motion.section
                key={group.key}
                layout={reduce ? false : "position"}
                aria-label={group.label}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
                transition={CARD_SPRING}
                className="relative flex flex-col gap-3"
              >
                <div className="sticky top-[4.5rem] z-10 -mx-1 flex">
                  <h3 className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line/70 bg-paper/70 py-1 pl-2.5 pr-3 text-[12.5px] font-semibold tracking-tight text-ink shadow-[0_1px_2px_rgb(var(--shadow-color)/0.04),0_6px_16px_-8px_rgb(var(--shadow-color)/0.12)] backdrop-blur-xl backdrop-saturate-150">
                    <span
                      aria-hidden
                      className={cn("size-1.5 shrink-0 rounded-full", group.key === "drafts" ? "bg-faint" : "bg-accent")}
                    />
                    {group.label}
                    {group.sub && <span className="font-normal tabular text-muted">{group.sub}</span>}
                  </h3>
                </div>
                <div className="relative flex flex-col gap-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {group.posts.map((post, i) => (
                      <motion.div
                        key={post.id}
                        layout={!reduce}
                        initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: { ...CARD_SPRING, delay: mounted ? 0 : Math.min(i, 6) * 0.045 },
                        }}
                        exit={
                          reduce
                            ? { opacity: 0, transition: { duration: 0.12 } }
                            : { opacity: 0, scale: 0.94, y: -6, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }
                        }
                        transition={CARD_SPRING}
                        className="min-w-0"
                      >
                        <PostCard post={post} driveConnected={driveConnected} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state with a gently floating illustration                    */
/* ------------------------------------------------------------------ */

function FeedEmpty({ kind, title, description }: { kind: "new" | "search"; title: string; description: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={CARD_SPRING}
      className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center backdrop-blur-xl"
    >
      <div className="relative mb-6 h-20 w-28" aria-hidden>
        <div className="absolute inset-x-0 top-1 flex justify-center">
          <motion.div
            animate={reduce ? undefined : { y: [0, -6, 0], rotate: [-2, 1.5, -2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="h-16 w-[4.5rem] rounded-2xl border border-line bg-surface p-2.5 text-left shadow-lift"
          >
            <span className="block h-1.5 w-8 rounded-full bg-accent/70" />
            <span className="mt-2 block h-1.5 w-full rounded-full bg-ink/10" />
            <span className="mt-1.5 block h-1.5 w-10 rounded-full bg-ink/10" />
            <span className="mt-2 flex gap-1">
              <span className="h-1.5 w-3 rounded-full bg-accent-soft" />
              <span className="h-1.5 w-4 rounded-full bg-accent-soft" />
            </span>
          </motion.div>
        </div>
        <motion.span
          animate={reduce ? undefined : { y: [0, -4, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          className="absolute -right-1 top-0 grid size-8 place-items-center rounded-full bg-accent text-accent-ink shadow-soft [&_svg]:size-4"
        >
          {kind === "new" ? <Sparkles /> : <Search />}
        </motion.span>
        <span className="absolute bottom-0 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-[50%] bg-ink/[0.06] blur-[2px]" />
      </div>
      <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-pretty text-[14px] leading-relaxed text-muted">{description}</p>
    </motion.div>
  );
}
