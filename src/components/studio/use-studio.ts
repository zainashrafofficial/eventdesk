"use client";

import * as React from "react";
import type { CaptionOption, GenerateResponse, Platform, Tone } from "@/types/db";

export type GenerateError = {
  kind: "rate" | "config" | "auth" | "invalid" | "upstream" | "network";
  message: string;
};

export type GeneratedMeta = { model: string; remaining: number; platform: Platform; tone: Tone; prompt: string };

const MAX_TAGS = 30;

/** Normalise free text into hashtag tokens (no leading '#', unicode letters/numbers/underscore). */
export function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, ""))
    .filter((t) => t.length > 0 && t.length <= 60);
}

export function mergeHashtags(current: string[], next: string[]): string[] {
  const seen = new Set(current.map((t) => t.toLowerCase()));
  const out = [...current];
  for (const tag of next) {
    if (out.length >= MAX_TAGS) break;
    if (!seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      out.push(tag);
    }
  }
  return out;
}

/** Character count of the post as it would be published: caption + "\n\n#tag #tag". */
export function postLength(caption: string, hashtags: string[]): number {
  const tags = hashtags.map((t) => `#${t}`).join(" ");
  return caption.trim().length + (tags ? tags.length + 2 : 0);
}

function isGenerateResponse(value: unknown): value is GenerateResponse {
  return typeof value === "object" && value !== null && "ok" in value && typeof value.ok === "boolean";
}

/** All Studio composition state: generator inputs, AI results, the selected option and its edits. */
export function useStudio() {
  const [prompt, setPrompt] = React.useState("");
  const [platform, setPlatform] = React.useState<Platform>("instagram");
  const [tone, setTone] = React.useState<Tone>("friendly");
  const [count, setCount] = React.useState<2 | 3>(3);

  const [options, setOptions] = React.useState<CaptionOption[]>([]);
  const [meta, setMeta] = React.useState<GeneratedMeta | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<GenerateError | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [caption, setCaption] = React.useState("");
  const [hashtags, setHashtags] = React.useState<string[]>([]);

  const abortRef = React.useRef<AbortController | null>(null);

  // 429 countdown: tick once a second while a cooldown is active.
  const cooling = cooldown > 0;
  React.useEffect(() => {
    if (!cooling) return;
    const id = window.setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooling]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const generate = React.useCallback(async () => {
    const text = prompt.trim();
    if (text.length < 3 || loading || cooldown > 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setSelectedIndex(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, platform, tone, count }),
        signal: controller.signal,
      });
      const body: unknown = await res.json().catch(() => null);
      const parsed = isGenerateResponse(body) ? body : null;

      if (parsed?.ok) {
        setOptions(parsed.options);
        setMeta({ model: parsed.model, remaining: parsed.remaining, platform, tone, prompt: text });
        return;
      }

      const message = parsed && !parsed.ok ? parsed.error : "Something went wrong generating captions.";
      if (res.status === 429) {
        const header = Number(res.headers.get("Retry-After"));
        const seconds = parsed && !parsed.ok && parsed.retryAfterSeconds ? parsed.retryAfterSeconds : header || 30;
        setCooldown(Math.max(1, Math.ceil(seconds)));
        setError({ kind: "rate", message: "You're generating quickly. Take a breath." });
      } else if (res.status === 503) {
        setError({ kind: "config", message: "AI isn't configured yet. Add a Gemini API key on the server to enable generation." });
      } else if (res.status === 401) {
        setError({ kind: "auth", message: "Your session expired. Sign in again to keep generating." });
      } else if (res.status === 400) {
        setError({ kind: "invalid", message });
      } else {
        setError({ kind: "upstream", message });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError({ kind: "network", message: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, [prompt, platform, tone, count, loading, cooldown]);

  const select = React.useCallback(
    (index: number) => {
      const option = options[index];
      if (!option) return;
      setSelectedIndex(index);
      setCaption(option.caption);
      setHashtags(mergeHashtags([], option.hashtags.flatMap((t) => parseHashtags(t))));
    },
    [options],
  );

  const clearSelection = React.useCallback(() => setSelectedIndex(null), []);

  // A rate-limit error disappears by itself once the countdown reaches zero.
  const visibleError = error?.kind === "rate" && cooldown === 0 ? null : error;

  return {
    error: visibleError,
    prompt,
    setPrompt,
    platform,
    setPlatform,
    tone,
    setTone,
    count,
    setCount,
    options,
    meta,
    loading,
    cooldown,
    generate,
    selectedIndex,
    select,
    clearSelection,
    caption,
    setCaption,
    hashtags,
    setHashtags,
  };
}

export type StudioState = ReturnType<typeof useStudio>;
