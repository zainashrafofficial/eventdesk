import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect x="2" y="5" width="28" height="25" rx="7" fill="currentColor" />
      <rect x="8" y="2" width="3" height="7" rx="1.5" fill="currentColor" />
      <rect x="21" y="2" width="3" height="7" rx="1.5" fill="currentColor" />
      <circle cx="16" cy="19" r="5" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 text-ink", className)} aria-label={`${site.name} home`}>
      <LogoMark />
      <span className="serif text-[1.35rem] leading-none tracking-tight">{site.name}</span>
    </Link>
  );
}
