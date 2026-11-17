/** App-wide branding. Rename the product here (and in package.json) when the brief changes. */
export const site = {
  name: "EventDesk",
  tagline: "Plan events with the forecast in view",
  description:
    "EventDesk is a full-stack event planner: secure accounts, your own event records, file attachments in cloud storage, and live weather and maps for every venue.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** Sidebar / mobile navigation for the signed-in area. */
export const appNav = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/dashboard/events", label: "Events", icon: "events" },
  { href: "/dashboard/events/new", label: "New event", icon: "new" },
] as const;
