import type { Platform } from "@/types/db";
import { cn } from "@/lib/utils";

/**
 * Brand-neutral platform glyphs (monochrome, currentColor). Lucide v1 dropped brand icons,
 * so these are simple hand-drawn 24px strokes that sit comfortably next to lucide icons.
 */
export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: cn("size-4 shrink-0", className),
  };

  switch (platform) {
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="3.75" />
          <circle cx="17.1" cy="6.9" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M4.5 4h4.2l10.8 16h-4.2z" />
          <path d="M19.2 4l-6.1 6.9M10.9 13.1L4.8 20" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
          <path d="M8 10.5V16" />
          <circle cx="8" cy="7.75" r="0.5" fill="currentColor" />
          <path d="M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1.9 2.1 2.5V16" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M13 20.5V12.5c0-1.6.7-2.5 2.3-2.5H16" />
          <path d="M10 13.5h5" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M13.5 4v10.75a3.25 3.25 0 1 1-3.25-3.25" />
          <path d="M13.5 4c.4 2.6 2.3 4.4 5 4.6" />
        </svg>
      );
  }
}
