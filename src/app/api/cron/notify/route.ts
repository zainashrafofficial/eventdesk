import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminConfigured, isEmailConfigured, serverEnv } from "@/lib/env";
import { processDueReminders } from "@/lib/services/email";

/**
 * Reminder cron. Called every minute by Supabase pg_cron + pg_net (see supabase/cron.sql)
 * or any scheduler that can send `Authorization: Bearer <CRON_SECRET>`.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const received = Buffer.from(header, "utf8");
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}

async function handle(request: NextRequest) {
  const secret = serverEnv().cronSecret;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Cron isn't configured (CRON_SECRET)." }, { status: 503 });
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Reminders need the Supabase admin key (SUPABASE_SECRET_KEY)." },
      { status: 503 },
    );
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: false, error: "Email isn't configured (RESEND_API_KEY)." }, { status: 503 });
  }

  const started = Date.now();
  const counts = await processDueReminders();
  return NextResponse.json(
    { ok: true, ...counts, ms: Date.now() - started, at: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
