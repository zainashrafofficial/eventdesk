"use client";

import * as React from "react";
import { Search, Sparkles, X } from "lucide-react";
import type { PostRow } from "@/types/db";
import { EmptyState } from "@/components/ui/display";
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

      {/* Segmented control */}
      <div
        role="tablist"
        aria-label="Filter posts"
        className="no-scrollbar -mx-1 flex overflow-x-auto px-1"
      >
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
                  "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium",
                  "transition-[background-color,color,box-shadow] duration-200 ease-out",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                  active ? "bg-surface text-ink shadow-soft ring-1 ring-line" : "text-muted hover:text-ink",
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-center text-[11px] tabular leading-5 transition-colors",
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

      {posts.length === 0 ? (
        <EmptyState
          icon={<Sparkles />}
          title="No posts yet"
          description="Generate your first caption above, pick a time, and it lands here, synced to Drive with an email reminder."
          className="bg-surface/60"
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title={deferredQuery ? "No matches" : "Nothing here yet"}
          description={
            deferredQuery
              ? `No posts match “${deferredQuery}”. Try a different word or hashtag.`
              : "Posts in this view will show up here."
          }
          className="bg-surface/60"
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group, gi) => (
            <section key={group.key} aria-label={group.label} className="flex flex-col gap-3">
              <div className="sticky top-[4.5rem] z-10 -mx-2 flex">
                <h3 className="flex items-baseline gap-2 rounded-full border border-line/60 bg-paper/75 px-3 py-1 text-[13px] font-semibold text-ink shadow-[0_1px_2px_rgb(var(--shadow-color)/0.04)] backdrop-blur-xl">
                  {group.label}
                  {group.sub && <span className="font-normal text-muted">{group.sub}</span>}
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                {group.posts.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    driveConnected={driveConnected}
                    style={{ animationDelay: `${Math.min(gi * 2 + i, 8) * 45}ms` }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
