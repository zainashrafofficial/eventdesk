import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isAdminConfigured, publicEnv, serverEnv } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

/**
 * Service-role Supabase client. Bypasses RLS, so it is used ONLY on the server for work that has no
 * user session (cron reminders) or touches server-only columns (Drive refresh tokens).
 * Every caller must scope its queries by user_id itself.
 */
export function createAdminClient(): SupabaseClient {
  if (!isAdminConfigured()) {
    throw new Error(
      "Supabase admin client isn't configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY on the server.",
    );
  }
  if (!adminClient) {
    adminClient = createClient(publicEnv.supabaseUrl, serverEnv().supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}
