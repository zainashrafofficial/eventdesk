import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="glass sticky top-0 z-50 border-b border-line/70">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
            <a
              href="#features"
              className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink md:inline-flex"
            >
              Features
            </a>
            <a
              href="#how"
              className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink md:inline-flex"
            >
              How it works
            </a>
            <ThemeToggle className="size-9" />
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Open Studio</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="container-page flex flex-col gap-4 py-10 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-faint">© {new Date().getFullYear()}</span>
          </div>
          <p>Built with Next.js, Supabase, Google Gemini, Google Drive &amp; Resend.</p>
        </div>
      </footer>
    </div>
  );
}
