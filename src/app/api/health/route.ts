import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

/** GET /api/health: quick deployment check (no secrets exposed). */
export function GET() {
  return NextResponse.json({
    status: "ok",
    supabaseConfigured: isSupabaseConfigured,
    time: new Date().toISOString(),
  });
}
