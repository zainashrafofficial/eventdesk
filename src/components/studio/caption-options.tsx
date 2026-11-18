"use client";

import * as React from "react";
import { Check, Copy, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/display";
import { cn } from "@/lib/utils";
import { PLATFORM_LABELS, PLATFORM_LIMITS, type CaptionOption, type Platform } from "@/types/db";
import { PlatformIcon } from "./platform-icon";
import { postLength } from "./use-studio";

function fullText(option: CaptionOption) {
  const tags = option.hashtags.map((t) => `#${t.replace(/^#+/, "")}`).join(" ");
  return tags ? `${option.caption.trim()}\n\n${tags}` : option.caption.trim();
}

export function CaptionOptions({
  options,
  loading,
  count,
  platform,
  selectedIndex,
  onSelect,
}: {
  options: CaptionOption[];
  loading: boolean;
  count: 2 | 3;
  platform: Platform;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const [copied, setCopied] = React.useState<number | null>(null);

  async function copy(index: number, option: CaptionOption) {
    try {
      await navigator.clipboard.writeText(fullText(option));
      setCopied(index);
      toast.success("Caption copied", { description: "Paste it anywhere." });
      window.setTimeout(() => setCopied((c) => (c === index ? null : c)), 1600);
    } catch {
      toast.error("Couldn't copy to the clipboard");
    }
  }

  if (!loading && options.length === 0) return null;

  const gridCols = (loading ? count : options.length) === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3";

  return (
    <section aria-labelledby="options-title" aria-busy={loading} className="flex min-w-0 flex-col gap-4">
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <p className="eyebrow text-accent">Step 2</p>
          <h2 id="options-title" className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-ink">
            {loading ? "Writing your options…" : "Pick your favourite"}
          </h2>
        </div>
        {!loading && (
          <p className="hidden items-center gap-1.5 text-[13px] text-muted sm:flex">
            <PlatformIcon platform={platform} className="size-3.5" /> Tuned for {PLATFORM_LABELS[platform]}
          </p>
        )}
      </div>

      {loading ? (
        <div className={cn("grid gap-4", gridCols)}>
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              className="flex animate-fade-up flex-col gap-3 rounded-3xl border border-line bg-surface/80 p-5 backdrop-blur-xl"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[78%]" />
              <Skeleton className="h-4 w-[60%]" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-9 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div role="radiogroup" aria-labelledby="options-title" className={cn("grid gap-4", gridCols)}>
          {options.map((option, i) => {
            const selected = selectedIndex === i;
            const length = postLength(option.caption, option.hashtags);
            const limit = PLATFORM_LIMITS[platform];
            const over = length > limit;
            return (
              <article
                key={`${i}-${option.caption.slice(0, 24)}`}
                className={cn(
                  "group relative flex min-w-0 animate-fade-up flex-col rounded-3xl border bg-surface/80 p-5 backdrop-blur-xl transition-all duration-300",
                  selected
                    ? "border-accent shadow-lift ring-4 ring-accent/15"
                    : "border-line shadow-soft hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift",
                )}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="eyebrow">Option {i + 1}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-6 place-items-center rounded-full border transition-all duration-300",
                      selected ? "scale-100 border-accent bg-accent text-accent-ink" : "scale-90 border-line-strong text-transparent",
                    )}
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                </div>

                <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line break-words text-ink">{option.caption}</p>

                {option.hashtags.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Hashtags">
                    {option.hashtags.map((tag, j) => (
                      <li
                        key={`${tag}-${j}`}
                        className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
                      >
                        #{tag.replace(/^#+/, "")}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 pt-5">
                  <span
                    className={cn("min-w-0 whitespace-nowrap text-xs tabular", over ? "font-medium text-warning" : "text-faint")}
                    title={over ? `Over the ${PLATFORM_LABELS[platform]} limit` : undefined}
                  >
                    {length.toLocaleString("en-US")}/{limit.toLocaleString("en-US")}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void copy(i, option)}
                      aria-label={`Copy option ${i + 1}`}
                      className="grid size-9 place-items-center rounded-full text-muted transition-all duration-200 hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
                    >
                      {copied === i ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onSelect(i)}
                      className={cn(
                        "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.97]",
                        selected
                          ? "bg-accent text-accent-ink"
                          : "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2",
                      )}
                    >
                      {selected ? <Check className="size-3.5" /> : <MousePointerClick className="size-3.5" />}
                      {selected ? "Selected" : "Use this"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
