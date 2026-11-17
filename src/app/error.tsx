"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <span className="eyebrow">Error</span>
        <h1 className="display mt-3 text-5xl text-ink">Something broke.</h1>
        <p className="mt-3 text-muted">An unexpected error occurred. You can retry, or head back home.</p>
        <div className="mt-8 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
