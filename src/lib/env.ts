/**
 * Centralised, typed access to environment variables.
 * Only NEXT_PUBLIC_* values are used. This app needs no server secret: every
 * database and storage call runs as the signed-in user, enforced by Row Level Security.
 */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
};

/** True when Supabase URL + public key are present, so the landing page renders before setup. */
export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseKey);
