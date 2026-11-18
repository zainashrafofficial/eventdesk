import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Fixed-window rate limiter backed by the `check_rate_limit` Postgres RPC, so the count is shared
 * by every serverless instance. Keyed by bucket + auth.uid() inside the database.
 */

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: string; retryAfterSeconds: number };

export const LIMITS = {
  generate: { limit: 10, window: 60 },
  mutate: { limit: 30, window: 60 },
  email: { limit: 5, window: 300 },
} as const;

const rpcRowSchema = z.object({
  allowed: z.boolean(),
  remaining: z.coerce.number().int(),
  reset_at: z.string(),
});
const rpcResultSchema = z.array(rpcRowSchema).min(1);

function failOpen(limit: number, windowSeconds: number): RateLimitResult {
  return {
    allowed: true,
    remaining: limit,
    resetAt: new Date(Date.now() + windowSeconds * 1000).toISOString(),
    retryAfterSeconds: 0,
  };
}

export async function rateLimit(bucket: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error(`[rate-limit] check_rate_limit failed for "${bucket}":`, error.message);
      return failOpen(limit, windowSeconds);
    }

    const parsed = rpcResultSchema.safeParse(data);
    if (!parsed.success) {
      console.error(`[rate-limit] unexpected check_rate_limit response for "${bucket}"`);
      return failOpen(limit, windowSeconds);
    }

    const row = parsed.data[0];
    const resetMs = new Date(row.reset_at).getTime();
    const resetAt = Number.isFinite(resetMs)
      ? new Date(resetMs).toISOString()
      : new Date(Date.now() + windowSeconds * 1000).toISOString();
    const retryAfterSeconds = Number.isFinite(resetMs)
      ? Math.max(1, Math.ceil((resetMs - Date.now()) / 1000))
      : Math.max(1, windowSeconds);

    return {
      allowed: row.allowed,
      remaining: Math.max(0, row.remaining),
      resetAt,
      retryAfterSeconds,
    };
  } catch (err) {
    console.error(`[rate-limit] error for "${bucket}":`, err instanceof Error ? err.message : err);
    return failOpen(limit, windowSeconds);
  }
}
