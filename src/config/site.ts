/** App-wide branding. Rename the product here (and in package.json) when the brief changes. */
export const site = {
  name: "Cadence",
  tagline: "AI captions, perfectly timed.",
  description:
    "Cadence writes on-brand social captions with Google Gemini, schedules them for the right moment, syncs every draft to Google Drive and emails you a reminder before it goes live.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** Competition + authorship credits, rendered on the landing page, auth pages and studio footer. */
export const credits = {
  event: "VSpark 2026",
  track: "Web Development Competition",
  university: "COMSATS University Islamabad",
  campus: "Vehari Campus",
  department: "Department of Computer Science",
  developer: "Zain Ashraf",
} as const;

/** Navigation for the signed-in area (Cadence is a single-page studio). */
export const appNav = [{ href: "/dashboard", label: "Studio", icon: "overview" }] as const;
