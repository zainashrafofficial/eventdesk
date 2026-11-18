import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

/** Rounded-square app icon: blue-to-indigo gradient with a white waveform "cadence" glyph. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7 shrink-0", className)}>
      <defs>
        <linearGradient id="cadence-logo-fill" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0a84ff" />
          <stop offset="1" stopColor="#5e5ce6" />
        </linearGradient>
        <linearGradient id="cadence-logo-sheen" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8.5" fill="url(#cadence-logo-fill)" />
      <rect width="32" height="32" rx="8.5" fill="url(#cadence-logo-sheen)" />
      <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
        <path d="M8.5 14.5v3" opacity="0.7" />
        <path d="M12.75 11v10" />
        <path d="M17 8v16" />
        <path d="M21.25 12v8" />
        <path d="M25.5 14.5v3" opacity="0.7" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 rounded-lg text-ink transition-opacity hover:opacity-80", className)}
      aria-label={`${site.name} home`}
    >
      <LogoMark />
      <span className="text-[17px] font-semibold leading-none tracking-[-0.022em]">{site.name}</span>
    </Link>
  );
}
