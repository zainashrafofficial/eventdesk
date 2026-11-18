import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { PLATFORM_LABELS, type CaptionOption, type GenerateRequest, type Platform } from "@/types/db";

/**
 * Google Gemini caption generator (REST, no SDK). Uses structured JSON output so the response is
 * machine-parseable, validates it with zod, and sanitises captions + hashtags before returning.
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 20_000;
const MAX_TAGS = 10;

export class GeminiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

const PLATFORM_GUIDANCE: Record<Platform, string> = {
  instagram:
    "Instagram: a strong first line, can use line breaks and emojis sparingly; 1-4 short paragraphs.",
  x: "X (Twitter): punchy and concise. The caption PLUS its hashtags (with '#' and spaces) must fit in 240 characters.",
  linkedin:
    "LinkedIn: professional and insightful; multi-line is fine; open with a hook, add value, end with a question or CTA.",
  facebook: "Facebook: conversational and warm; 1-3 short paragraphs; invite comments.",
  tiktok: "TikTok: energetic, short, trend-aware hook; 1-2 lines that complement a video.",
};

function buildSystemInstruction(req: GenerateRequest): string {
  return [
    "You are an expert social media copywriter.",
    `Write ${req.count} distinct caption options for ${PLATFORM_LABELS[req.platform]} in a ${req.tone} tone.`,
    "Each caption must be ready to post as-is, with a platform-appropriate length:",
    "- X: 240 characters or fewer INCLUDING hashtags.",
    "- LinkedIn: professional; multi-line is OK.",
    "- Instagram: line breaks and emojis are OK, used sparingly.",
    `Platform guidance: ${PLATFORM_GUIDANCE[req.platform]}`,
    "Give each option 3-8 relevant hashtags, WITHOUT the '#' symbol, and do NOT repeat the hashtags inside the caption text.",
    "Vary the angle across options: one leads with a hook, one tells a short story, one drives a clear call to action.",
    "Never invent facts, prices, dates or statistics that are not in the brief.",
    'Respond only with JSON matching the schema: {"options":[{"caption":"...","hashtags":["..."]}]}.',
  ].join("\n");
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    options: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          caption: { type: "STRING" },
          hashtags: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["caption", "hashtags"],
      },
    },
  },
  required: ["options"],
} as const;

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(z.object({ text: z.string().optional() })).optional(),
          })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
});

const optionsPayloadSchema = z.object({
  options: z.array(
    z.object({
      caption: z.string(),
      hashtags: z.array(z.string()).default([]),
    }),
  ),
});

const geminiErrorBodySchema = z.object({
  error: z.object({ message: z.string().optional(), status: z.string().optional() }).optional(),
});

function modelChain(): string[] {
  const chain = [serverEnv().geminiModel, "gemini-flash-lite-latest", "gemini-flash-latest"]
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set(chain)];
}

/** Strip '#', spaces and punctuation; keep letters/numbers/underscore (Unicode-aware). */
function cleanTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
}

function sanitizeOptions(raw: z.infer<typeof optionsPayloadSchema>, count: number): CaptionOption[] {
  const out: CaptionOption[] = [];
  for (const opt of raw.options) {
    const caption = opt.caption.trim();
    if (!caption) continue;
    const seen = new Set<string>();
    const hashtags: string[] = [];
    for (const tag of opt.hashtags) {
      const clean = cleanTag(tag);
      const key = clean.toLowerCase();
      if (!clean || seen.has(key)) continue;
      seen.add(key);
      hashtags.push(clean);
      if (hashtags.length >= MAX_TAGS) break;
    }
    out.push({ caption, hashtags });
  }
  return out.slice(0, count);
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    const parsed = geminiErrorBodySchema.safeParse(body);
    return parsed.success ? (parsed.data.error?.message ?? "") : "";
  } catch {
    return "";
  }
}

type Attempt = { kind: "not-found" } | { kind: "ok"; options: CaptionOption[] };

async function callModel(model: string, req: GenerateRequest): Promise<Attempt> {
  const { geminiApiKey } = serverEnv();
  const body = {
    systemInstruction: { parts: [{ text: buildSystemInstruction(req) }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Brief: ${req.prompt}\nPlatform: ${PLATFORM_LABELS[req.platform]}\nTone: ${req.tone}\nNumber of options: ${req.count}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.9,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      // Captions don't need step-by-step reasoning: disabling "thinking" cuts latency from ~25s to ~5-9s.
      // (Lite models don't think and reject this field.)
      ...(model.includes("lite") ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
    },
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiApiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new GeminiError(
      timedOut ? "Gemini took too long to respond. Please try again." : "Couldn't reach Gemini. Please try again.",
      504,
    );
  }

  if (res.status === 404) return { kind: "not-found" };

  if (!res.ok) {
    const detail = await readErrorMessage(res);
    if (res.status === 429) {
      throw new GeminiError("Gemini is rate limiting requests right now. Wait a moment and try again.", 429);
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      console.error(`[gemini] HTTP ${res.status} from ${model}:`, detail);
      throw new GeminiError("Gemini rejected the request (check GEMINI_API_KEY)", 502);
    }
    console.error(`[gemini] HTTP ${res.status} from ${model}:`, detail);
    throw new GeminiError("Gemini is unavailable right now. Please try again shortly.", 502);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new GeminiError("Gemini returned an unreadable response. Please try again.", 502);
  }

  const parsed = geminiResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new GeminiError("Gemini returned an unexpected response. Please try again.", 502);
  }

  const { candidates, promptFeedback } = parsed.data;
  const candidate = candidates?.[0];
  if (promptFeedback?.blockReason || candidate?.finishReason === "SAFETY" || candidate?.finishReason === "PROHIBITED_CONTENT") {
    throw new GeminiError("The prompt was blocked by safety filters. Try rephrasing.", 422);
  }

  const text = (candidate?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new GeminiError("Gemini returned no captions. Please try again.", 502);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new GeminiError("Gemini returned malformed captions. Please try again.", 502);
  }

  const options = optionsPayloadSchema.safeParse(payload);
  if (!options.success) {
    throw new GeminiError("Gemini returned captions in an unexpected format. Please try again.", 502);
  }

  const clean = sanitizeOptions(options.data, req.count);
  if (clean.length === 0) {
    throw new GeminiError("Gemini returned no usable captions. Try rephrasing your prompt.", 502);
  }
  return { kind: "ok", options: clean };
}

export async function generateCaptions(req: GenerateRequest): Promise<{ options: CaptionOption[]; model: string }> {
  if (!serverEnv().geminiApiKey) {
    throw new GeminiError("AI generation isn't configured. Add GEMINI_API_KEY.", 503);
  }

  // Resilience: walk the model chain. A missing model (404), an overloaded model (502/503) or a slow
  // model (504 timeout) moves on to the next one; key/safety/rate-limit errors stop immediately.
  let lastError: GeminiError | null = null;
  for (const model of modelChain()) {
    try {
      const result = await callModel(model, req);
      if (result.kind === "ok") return { options: result.options, model };
      console.warn(`[gemini] model "${model}" not found, trying the next fallback`);
    } catch (err) {
      if (err instanceof GeminiError && (err.status === 502 || err.status === 504)) {
        console.warn(`[gemini] model "${model}" failed (${err.status}), trying the next fallback`);
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new GeminiError("No available Gemini model answered. Check GEMINI_MODEL.", 502);
}
