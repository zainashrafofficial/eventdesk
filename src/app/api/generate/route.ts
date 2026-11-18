import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { isGeminiConfigured } from "@/lib/env";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { GeminiError, generateCaptions } from "@/lib/services/gemini";
import { generateSchema } from "@/lib/validation/generate";
import type { GenerateResponse } from "@/types/db";

export const runtime = "nodejs";
export const maxDuration = 30;

function json(body: GenerateResponse, status: number, headers?: Record<string, string>) {
  return NextResponse.json<GenerateResponse>(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

/** POST /api/generate: signed-in users get 2-3 AI caption options. Rate limited per user. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return json({ ok: false, error: "Sign in to generate captions." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Send a valid JSON body." }, 400);
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." }, 400);
  }

  if (!isGeminiConfigured()) {
    return json({ ok: false, error: "AI generation isn't configured. Add GEMINI_API_KEY." }, 503);
  }

  const limit = await rateLimit("generate", LIMITS.generate.limit, LIMITS.generate.window);
  if (!limit.allowed) {
    return json(
      {
        ok: false,
        error: `You're generating too fast. Try again in ${limit.retryAfterSeconds}s.`,
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      429,
      { "Retry-After": String(limit.retryAfterSeconds), "X-RateLimit-Remaining": "0" },
    );
  }

  try {
    const { options, model } = await generateCaptions(parsed.data);
    return json({ ok: true, options, model, remaining: limit.remaining }, 200, {
      "X-RateLimit-Remaining": String(limit.remaining),
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      return json({ ok: false, error: err.message }, err.status);
    }
    console.error("[api/generate] unexpected error:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Something went wrong generating captions. Please try again." }, 500);
  }
}
