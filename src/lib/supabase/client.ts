"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

let browserClient: SupabaseClient | undefined;

/** Browser Supabase client (singleton). Used for direct-to-Storage uploads; RLS still applies. */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseKey);
  }
  return browserClient;
}
