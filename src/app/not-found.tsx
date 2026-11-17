import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <span className="eyebrow">404</span>
        <h1 className="display mt-3 text-5xl text-ink">Page not found.</h1>
        <p className="mt-3 text-muted">It may have been deleted, or it belongs to another account.</p>
        <div className="mt-8 flex justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
