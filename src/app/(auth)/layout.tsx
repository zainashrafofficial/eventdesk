import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme";
import { site } from "@/config/site";

/** Centered, Apple ID-style auth layout: mark, title, one calm card. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-18rem] h-[34rem] w-[52rem] max-w-[160vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_14%,transparent),transparent)]"
      />
      <header className="relative flex items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg text-ink transition-opacity hover:opacity-80" aria-label={`${site.name} home`}>
          <LogoMark className="size-6" />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">{site.name}</span>
        </Link>
        <ThemeToggle className="size-9" />
      </header>

      <main id="main" className="relative flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-4">
        <div className="w-full max-w-[26rem] animate-fade-up">
          <div className="flex justify-center">
            <LogoMark className="size-14 drop-shadow-[0_8px_24px_rgb(0_113_227/0.28)]" />
          </div>
          {children}
        </div>
      </main>

      <footer className="relative pb-6 text-center text-xs text-faint">
        {site.name} · {site.tagline}
      </footer>
    </div>
  );
}
