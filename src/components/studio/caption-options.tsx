"use client";

import * as React from "react";
import { Check, Copy, MousePointerClick } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/display";
import { cn } from "@/lib/utils";
import { PLATFORM_LABELS, PLATFORM_LIMITS, type CaptionOption, type Platform } from "@/types/db";
import { PlatformIcon } from "./platform-icon";
import { postLength } from "./use-studio";

const SPRING = { type: "spring", stiffness: 320, damping: 30, mass: 0.8 } as const;

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};
const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12, filter: "blur(6px)" },
  show: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transition: SPRING },
  exit: { opacity: 0, scale: 0.98, y: -6, filter: "blur(4px)", transition: { duration: 0.16, ease: "easeIn" } },
};

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

  const visible = loading || options.length > 0;
  const gridCols = (loading ? count : options.length) === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3";

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.section
          key="options"
          aria-labelledby="options-title"
          aria-busy={loading}
          className="flex min-w-0 flex-col gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6, transition: { duration: 0.18 } }}
          transition={SPRING}
        >
          <div className="flex items-end justify-between gap-4 px-1">
            <div className="min-w-0">
              <p className="eyebrow text-accent">Step 2</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2
                  key={loading ? "loading" : "ready"}
                  id="options-title"
                  className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-ink"
                  initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.14 } }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  {loading ? "Writing your options…" : "Pick your favourite"}
                </motion.h2>
              </AnimatePresence>
            </div>
            {!loading && (
              <p className="hidden shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1 text-[12.5px] text-muted backdrop-blur sm:flex">
                <PlatformIcon platform={platform} className="size-3.5" /> Tuned for {PLATFORM_LABELS[platform]}
              </p>
            )}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.div
                key="skeleton"
                variants={gridVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className={cn("grid gap-4", gridCols)}
              >
                {Array.from({ length: count }, (_, i) => (
                  <motion.div
                    key={i}
                    variants={cardVariants}
                    className="relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-line bg-surface/80 p-5 backdrop-blur-xl"
                  >
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-accent/[0.07] to-transparent"
                      animate={{ x: ["0%", "400%"] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                    />
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
                  </motion.div>
                ))}
              </motion.div>
            ) : (
                <motion.div
                  key="options-grid"
                  role="radiogroup"
                  aria-labelledby="options-title"
                  variants={gridVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className={cn("grid gap-4", gridCols)}
                >
                  {options.map((option, i) => {
                    const selected = selectedIndex === i;
                    const length = postLength(option.caption, option.hashtags);
                    const limit = PLATFORM_LIMITS[platform];
                    const over = length > limit;
                    return (
                      <motion.article
                        key={`${i}-${option.caption.slice(0, 24)}`}
                        variants={cardVariants}
                        whileHover={selected ? undefined : { y: -4, transition: { type: "spring", stiffness: 400, damping: 26 } }}
                        className={cn(
                          "group relative flex min-w-0 flex-col rounded-3xl border bg-surface/80 p-5 backdrop-blur-xl transition-[border-color,box-shadow] duration-300",
                          selected
                            ? "border-transparent shadow-lift"
                            : "border-line shadow-soft hover:border-line-strong hover:shadow-lift",
                        )}
                      >
                        {selected && (
                          <motion.span
                            layoutId="option-ring"
                            aria-hidden
                            className="pointer-events-none absolute -inset-px rounded-[inherit] border-[1.5px] border-accent ring-4 ring-accent/15"
                            transition={SPRING}
                          />
                        )}

                        <div className="flex items-center justify-between gap-3">
                          <span className="eyebrow">Option {i + 1}</span>
                          <span
                            aria-hidden
                            className="relative grid size-6 place-items-center rounded-full border border-line-strong"
                          >
                            <AnimatePresence initial={false}>
                              {selected && (
                                <motion.span
                                  key="check"
                                  className="absolute -inset-px grid place-items-center rounded-full bg-accent text-accent-ink"
                                  initial={{ scale: 0.4, opacity: 0, rotate: -45 }}
                                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                  exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.14 } }}
                                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                                >
                                  <Check className="size-3.5" strokeWidth={3} />
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                        </div>

                        <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line break-words text-ink">
                          {option.caption}
                        </p>

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

                        {/* One-line footer: never wraps. */}
                        <div className="mt-auto flex flex-nowrap items-center justify-between gap-2 pt-5">
                          <span
                            className={cn(
                              "min-w-0 truncate whitespace-nowrap text-xs tabular",
                              over ? "font-medium text-warning" : "text-faint",
                            )}
                            title={over ? `Over the ${PLATFORM_LABELS[platform]} limit` : undefined}
                          >
                            {length.toLocaleString("en-US")}/{limit.toLocaleString("en-US")}
                          </span>
                          <div className="flex shrink-0 flex-nowrap items-center gap-1">
                            <motion.button
                              type="button"
                              onClick={() => void copy(i, option)}
                              aria-label={`Copy option ${i + 1}`}
                              whileTap={{ scale: 0.9 }}
                              className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors duration-200 hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                  key={copied === i ? "done" : "copy"}
                                  initial={{ scale: 0.6, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.6, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="grid place-items-center"
                                >
                                  {copied === i ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                                </motion.span>
                              </AnimatePresence>
                            </motion.button>
                            <motion.button
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => onSelect(i)}
                              whileTap={{ scale: 0.95 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className={cn(
                                "relative inline-flex h-9 shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                                selected
                                  ? "text-accent-ink"
                                  : "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2",
                              )}
                            >
                              {selected && (
                                <motion.span
                                  layoutId="option-cta"
                                  aria-hidden
                                  className="absolute inset-0 rounded-full bg-accent"
                                  transition={SPRING}
                                />
                              )}
                              <span className="relative z-10 inline-flex items-center gap-1.5">
                                {selected ? <Check className="size-3.5" /> : <MousePointerClick className="size-3.5" />}
                                {selected ? "Selected" : "Use this"}
                              </span>
                            </motion.button>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
