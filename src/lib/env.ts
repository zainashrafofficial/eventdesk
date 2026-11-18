/**
 * Centralised, typed access to environment variables.
 * NEXT_PUBLIC_* values are safe for the browser. serverEnv() must only be called on the server.
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

export function serverEnv() {
  return {
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    geminiModel: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    emailFrom: process.env.EMAIL_FROM ?? "Cadence <onboarding@resend.dev>",
    cronSecret: process.env.CRON_SECRET ?? "",
  };
}

export const isGeminiConfigured = () => Boolean(serverEnv().geminiApiKey);
export const isDriveConfigured = () => Boolean(serverEnv().googleClientId && serverEnv().googleClientSecret);
export const isEmailConfigured = () => Boolean(serverEnv().resendApiKey);
export const isAdminConfigured = () => Boolean(publicEnv.supabaseUrl && serverEnv().supabaseSecretKey);
