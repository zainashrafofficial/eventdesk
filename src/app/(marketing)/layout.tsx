import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";
import { site } from "@/config/site";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Main">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Open dashboard</Link>
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
        <div className="container-page flex flex-col gap-3 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. Built with Next.js and Supabase.
          </p>
          <p>
            Weather data by{" "}
            <a href="https://open-meteo.com" className="underline-offset-4 hover:text-ink hover:underline" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            · Maps ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              className="underline-offset-4 hover:text-ink hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
