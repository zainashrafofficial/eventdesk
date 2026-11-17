import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Data Access Layer: the ONLY place that reads the session.
 * Every protected page, Server Action and Route Handler authorises through these helpers
 * (layer 2 of route protection; the proxy is layer 1, Postgres RLS is layer 3).
 */

export type SessionUser = { id: string; email: string; fullName: string };

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  // getClaims() verifies the JWT, unlike getSession() which trusts the cookie as-is.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const email = typeof claims.email === "string" ? claims.email : "";
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const name = typeof meta.full_name === "string" ? meta.full_name.trim() : "";

  return { id: claims.sub, email, fullName: name || email.split("@")[0] || "there" };
});

/** For pages and actions: redirects to /login when signed out. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}
