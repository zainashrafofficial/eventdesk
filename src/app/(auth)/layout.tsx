import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { AuthBackdrop, AuthEnter } from "@/components/marketing/auth-shell";
import { MotionProvider } from "@/components/marketing/motion-primitives";
import { ThemeToggle } from "@/components/theme";
import { credits, site } from "@/config/site";

/** Centered, Apple ID-style auth layout: mark, title, one calm card over a soft animated glow. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <div className="relative flex min-h-dvh flex-col overflow-hidden bg-paper">
        <AuthBackdrop />
        <header className="relative flex items-center justify-between px-5 py-4 md:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg text-ink transition-opacity hover:opacity-80"
            aria-label={`${site.name} home`}
          >
            <LogoMark className="size-6" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">{site.name}</span>
          </Link>
          <ThemeToggle className="size-9" />
        </header>

        <main id="main" className="relative flex flex-1 flex-col items-center justify-center px-5 pb-12 pt-4">
          <AuthEnter className="w-full max-w-[26rem]">
            <div className="flex justify-center">
              <LogoMark className="size-14 drop-shadow-[0_8px_24px_rgb(0_113_227/0.28)]" />
            </div>
            {children}
            <p className="mt-6 text-center text-xs font-medium text-faint">
              {credits.event} · COMSATS {credits.campus.replace(" Campus", "")}
            </p>
          </AuthEnter>
        </main>

        <footer className="relative pb-6 text-center text-xs text-faint">
          {site.name} · {site.tagline}
        </footer>
      </div>
    </MotionProvider>
  );
}
