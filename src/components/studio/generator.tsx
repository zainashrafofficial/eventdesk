"use client";

import * as React from "react";
import { CircleAlert, Cpu, RotateCcw, Sparkles, Timer } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/display";
import { cn } from "@/lib/utils";
import { PLATFORMS, PLATFORM_LABELS, PLATFORM_LIMITS, TONES, type Platform, type Tone } from "@/types/db";
import { PlatformIcon } from "./platform-icon";
import type { StudioState } from "./use-studio";

const MAX_PROMPT = 500;
const SUGGESTIONS = ["Launching our new coffee blend", "Hiring a senior designer", "Weekend sale 30% off"] as const;
const TONE_LABEL: Record<Tone, string> = {
  professional: "Professional",
  playful: "Playful",
  inspirational: "Inspirational",
  witty: "Witty",
  bold: "Bold",
  friendly: "Friendly",
};

const PILL_SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 } as const;
const BORDER_MASK = "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)";

const noopSubscribe = () => () => {};
function useIsMac() {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => true,
  );
}

export function Generator({ studio }: { studio: StudioState }) {
  const { prompt, setPrompt, platform, setPlatform, tone, setTone, count, setCount, loading, error, cooldown, meta, generate } =
    studio;
  const isMac = useIsMac();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const canGenerate = prompt.trim().length >= 3 && cooldown === 0;

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void generate();
    }
  }

  return (
    <section
      aria-labelledby="generator-title"
      onKeyDown={onKeyDown}
      className={cn(
        "glass relative isolate overflow-hidden rounded-[28px] border shadow-soft transition-[border-color,box-shadow] duration-500",
        loading ? "border-transparent shadow-lift" : "border-line",
      )}
    >
      {/* Animated gradient border + soft glow while Gemini is writing */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="generating-glow"
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="absolute inset-0 overflow-hidden rounded-[28px]"
              style={{
                padding: "1.5px",
                WebkitMask: BORDER_MASK,
                WebkitMaskComposite: "xor",
                mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
              }}
            >
              <motion.div
                className="absolute top-1/2 left-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,var(--accent)_60deg,#5e5ce6_120deg,#bf5af2_160deg,transparent_230deg,transparent_360deg)]"
                animate={{ rotate: 360 }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <motion.div
              className="absolute -top-28 left-1/2 h-56 w-[70%] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
              animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <LayoutGroup id="generator">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
        className="flex flex-col gap-6 p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-1.5 text-accent">
              <Sparkles className="size-3.5" aria-hidden /> Step 1
            </p>
            <h2 id="generator-title" className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-ink sm:text-[22px]">
              Describe your post
            </h2>
          </div>
          <span className="hidden items-center gap-1 pt-1 text-xs text-muted sm:inline-flex">
            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>↵</Kbd>
            <span className="ml-1">to generate</span>
          </span>
        </div>

        {/* Prompt */}
        <div className="group relative rounded-2xl border border-line bg-surface/70 transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 hover:border-line-strong">
          <label htmlFor="studio-prompt" className="sr-only">
            Describe your post
          </label>
          <textarea
            ref={textareaRef}
            id="studio-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
            maxLength={MAX_PROMPT}
            rows={3}
            placeholder="Describe your post… e.g. A cozy autumn launch for our cinnamon oat latte, available from Monday."
            className="block max-h-72 min-h-28 w-full resize-none bg-transparent px-4 pt-4 pb-10 text-base leading-relaxed text-ink outline-none field-sizing-content placeholder:text-faint sm:px-5 sm:text-[17px]"
          />
          <span
            aria-live="polite"
            className={cn(
              "pointer-events-none absolute right-4 bottom-3 text-xs text-faint tabular transition-colors",
              prompt.length > MAX_PROMPT * 0.9 && "text-warning",
            )}
          >
            {prompt.length}/{MAX_PROMPT}
          </span>
        </div>

        {/* Suggestions */}
        <div className="-mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar mask-fade-x sm:flex-wrap sm:overflow-visible sm:[mask-image:none]">
          <span className="shrink-0 text-xs font-medium text-muted">Try</span>
          {SUGGESTIONS.map((s) => (
            <motion.button
              key={s}
              type="button"
              onClick={() => {
                setPrompt(s);
                textareaRef.current?.focus();
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-ink-2 transition-[border-color,color,box-shadow] duration-200 hover:border-line-strong hover:text-ink hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {s}
            </motion.button>
          ))}
        </div>

        <div className="h-px bg-line" role="presentation" />

        {/* Platform */}
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span id="platform-label" className="text-sm font-medium text-ink">Platform</span>
            <span className="text-xs text-muted tabular">
              {PLATFORM_LABELS[platform]} · {PLATFORM_LIMITS[platform].toLocaleString("en-US")} chars
            </span>
          </div>
          <div role="radiogroup" aria-labelledby="platform-label" className="relative isolate grid grid-cols-5 gap-0.5 rounded-2xl bg-ink/[0.05] p-1">
            {PLATFORMS.map((p: Platform) => {
              const active = p === platform;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={PLATFORM_LABELS[p]}
                  onClick={() => setPlatform(p)}
                  className={cn(
                    "relative isolate flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                    active ? "text-ink" : "text-muted hover:text-ink-2",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="platform-pill"
                      aria-hidden
                      className="absolute inset-0 -z-10 rounded-xl bg-surface shadow-soft ring-1 ring-line"
                      transition={PILL_SPRING}
                    />
                  )}
                  <motion.span
                    className="inline-flex"
                    animate={{ scale: active ? 1.08 : 1 }}
                    transition={PILL_SPRING}
                  >
                    <PlatformIcon platform={p} className="size-[18px]" />
                  </motion.span>
                  <span className="hidden md:inline">{PLATFORM_LABELS[p]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid min-w-0 gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
          {/* Tone */}
          <fieldset className="flex min-w-0 flex-col gap-2.5">
            <legend className="mb-2.5 text-sm font-medium text-ink">Tone</legend>
            <div role="radiogroup" aria-label="Tone" className="flex flex-wrap gap-2">
              {TONES.map((t) => {
                const active = t === tone;
                return (
                  <motion.button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTone(t)}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={cn(
                      "relative isolate h-9 rounded-full border px-3.5 text-[13px] font-medium transition-[border-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      active
                        ? "border-transparent text-paper"
                        : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="tone-pill"
                        aria-hidden
                        className="absolute -inset-px -z-10 rounded-full bg-ink shadow-soft"
                        transition={PILL_SPRING}
                      />
                    )}
                    {TONE_LABEL[t]}
                  </motion.button>
                );
              })}
            </div>
          </fieldset>

          {/* Count */}
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-sm font-medium text-ink">Options</legend>
            <div role="radiogroup" aria-label="Number of options" className="relative isolate grid w-28 grid-cols-2 rounded-full bg-ink/[0.05] p-1">
              {([2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={count === n}
                  aria-label={`${n} options`}
                  onClick={() => setCount(n)}
                  className={cn(
                    "relative isolate h-8 rounded-full text-sm font-semibold tabular transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                    count === n ? "text-ink" : "text-muted hover:text-ink-2",
                  )}
                >
                  {count === n && (
                    <motion.span
                      layoutId="count-pill"
                      aria-hidden
                      className="absolute inset-0 -z-10 rounded-full bg-surface shadow-soft ring-1 ring-line"
                      transition={PILL_SPRING}
                    />
                  )}
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 min-w-0 text-[13px] leading-snug" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
            {error ? (
              <motion.div
                key={`error-${error.kind}`}
                initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)", x: error.kind === "rate" || error.kind === "config" ? 0 : [0, -5, 5, -3, 3, 0] }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], x: { duration: 0.4 } }}
                role={error.kind === "config" ? "status" : "alert"}
                className={cn(
                  "flex items-start gap-2",
                  error.kind === "config" || error.kind === "rate" ? "text-ink-2" : "text-danger",
                )}
              >
                {error.kind === "rate" ? (
                  <CooldownRing seconds={cooldown} />
                ) : (
                  <CircleAlert className={cn("mt-0.5 size-4 shrink-0", error.kind === "config" && "text-warning")} aria-hidden />
                )}
                <span className="min-w-0">
                  {error.kind === "rate" ? (
                    <>
                      {error.message} Try again in <Countdown value={cooldown} />s.
                    </>
                  ) : (
                    error.message
                  )}
                  {error.kind !== "rate" && error.kind !== "config" && error.kind !== "auth" && (
                    <button
                      type="button"
                      onClick={() => void generate()}
                      className="ml-2 inline-flex items-center gap-1 font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <RotateCcw className="size-3.5" aria-hidden /> Retry
                    </button>
                  )}
                </span>
              </motion.div>
            ) : meta ? (
              <motion.p
                key="meta"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
                className="flex items-center gap-1.5 text-muted"
              >
                <Cpu className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  Generated with {meta.model} · {meta.remaining} left this minute
                </span>
              </motion.p>
            ) : (
              <motion.p
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="text-muted"
              >
                Cadence writes {count} on-brand options with hashtags in seconds.
              </motion.p>
            )}
            </AnimatePresence>
          </div>

          <motion.div
            className="relative w-full shrink-0 rounded-full sm:w-auto"
            whileHover={canGenerate && !loading ? { scale: 1.015 } : undefined}
            whileTap={canGenerate && !loading ? { scale: 0.96 } : undefined}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
          >
          <Button
            type="submit"
            size="lg"
            loading={loading}
            disabled={!canGenerate}
            className="w-full shadow-lift sm:w-auto"
          >
            {cooldown > 0 ? (
              <>
                <Timer /> Try again in <Countdown value={cooldown} />s
              </>
            ) : (
              <>
                <Sparkles className="transition-transform duration-300 group-hover/button:rotate-12 group-hover/button:scale-110" />
                {meta ? "Regenerate" : "Generate captions"}
              </>
            )}
          </Button>
            <AnimatePresence>
              {loading && (
                <motion.span
                  key="shimmer"
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.span
                    className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/35 to-transparent"
                    animate={{ x: ["0%", "400%"] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </form>
      </LayoutGroup>
    </section>
  );
}

/** Rolling digit for the rate-limit countdown. */
function Countdown({ value }: { value: number }) {
  return (
    <span className="relative inline-flex overflow-hidden tabular">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="inline-block"
          initial={{ y: "-70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "70%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Tiny ring that drains as the cooldown counts down (assumes a 60s window). */
function CooldownRing({ seconds }: { seconds: number }) {
  const progress = Math.max(0, Math.min(1, seconds / 60));
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 -rotate-90 text-warning" aria-hidden>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={2.5} />
      <motion.circle
        cx="10"
        cy="10"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        initial={false}
        animate={{ pathLength: progress }}
        transition={{ duration: 0.9, ease: "linear" }}
      />
    </svg>
  );
}
