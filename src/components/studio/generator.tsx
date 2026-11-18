"use client";

import * as React from "react";
import { CircleAlert, Cpu, RotateCcw, Sparkles, Timer } from "lucide-react";
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
  const platformIndex = PLATFORMS.indexOf(platform);

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
      className="glass relative overflow-hidden rounded-[28px] border border-line shadow-soft"
    >
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
            <button
              key={s}
              type="button"
              onClick={() => {
                setPrompt(s);
                textareaRef.current?.focus();
              }}
              className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-ink-2 transition-all duration-200 hover:-translate-y-px hover:border-line-strong hover:text-ink hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-0"
            >
              {s}
            </button>
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
          <div role="radiogroup" aria-labelledby="platform-label" className="relative grid grid-cols-5 rounded-2xl bg-ink/[0.05] p-1">
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 rounded-xl bg-surface shadow-soft ring-1 ring-line transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: "calc((100% - 0.5rem) / 5)", transform: `translateX(${platformIndex * 100}%)` }}
            />
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
                    "relative z-10 flex h-10 items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                    active ? "text-ink" : "text-muted hover:text-ink-2",
                  )}
                >
                  <PlatformIcon platform={p} className="size-[18px]" />
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
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTone(t)}
                    className={cn(
                      "h-9 rounded-full border px-3.5 text-[13px] font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.97]",
                      active
                        ? "border-transparent bg-ink text-paper shadow-soft"
                        : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {TONE_LABEL[t]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Count */}
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-sm font-medium text-ink">Options</legend>
            <div role="radiogroup" aria-label="Number of options" className="relative grid w-28 grid-cols-2 rounded-full bg-ink/[0.05] p-1">
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 rounded-full bg-surface shadow-soft ring-1 ring-line transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: "calc((100% - 0.5rem) / 2)", transform: `translateX(${count === 2 ? 0 : 100}%)` }}
              />
              {([2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={count === n}
                  aria-label={`${n} options`}
                  onClick={() => setCount(n)}
                  className={cn(
                    "relative z-10 h-8 rounded-full text-sm font-semibold tabular transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                    count === n ? "text-ink" : "text-muted hover:text-ink-2",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 min-w-0 text-[13px] leading-snug" aria-live="polite">
            {error ? (
              <div
                role={error.kind === "config" ? "status" : "alert"}
                className={cn(
                  "flex animate-fade-up items-start gap-2",
                  error.kind === "config" || error.kind === "rate" ? "text-ink-2" : "text-danger",
                )}
              >
                {error.kind === "rate" ? (
                  <Timer className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                ) : (
                  <CircleAlert className={cn("mt-0.5 size-4 shrink-0", error.kind === "config" && "text-warning")} aria-hidden />
                )}
                <span className="min-w-0">
                  {error.kind === "rate" ? `${error.message} Try again in ${cooldown}s.` : error.message}
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
              </div>
            ) : meta ? (
              <p className="flex animate-fade-up items-center gap-1.5 text-muted">
                <Cpu className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  Generated with {meta.model} · {meta.remaining} left this minute
                </span>
              </p>
            ) : (
              <p className="text-muted">Cadence writes {count} on-brand options with hashtags in seconds.</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            loading={loading}
            disabled={!canGenerate}
            className="w-full shadow-lift sm:w-auto"
          >
            {cooldown > 0 ? (
              <>
                <Timer /> Try again in {cooldown}s
              </>
            ) : (
              <>
                <Sparkles className="transition-transform duration-300 group-hover/button:rotate-12 group-hover/button:scale-110" />
                {meta ? "Regenerate" : "Generate captions"}
              </>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
