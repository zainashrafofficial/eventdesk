import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * User-scoped Supabase client for Server Components, Server Actions and Route Handlers.
 * It carries the user's session cookie, so every query is filtered by Row Level Security.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component. The proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}
