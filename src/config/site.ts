/** App-wide branding. Rename the product here (and in package.json) when the brief changes. */
export const site = {
  name: "Cadence",
  tagline: "AI captions, perfectly timed.",
  description:
    "Cadence writes on-brand social captions with Google Gemini, schedules them for the right moment, syncs every draft to Google Drive and emails you a reminder before it goes live.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** Navigation for the signed-in area (Cadence is a single-page studio). */
export const appNav = [{ href: "/dashboard", label: "Studio", icon: "overview" }] as const;
