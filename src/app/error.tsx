"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-paper px-5 text-center">
      <div className="flex max-w-md flex-col items-center">
        <LogoMark className="size-12" />
        <h1 className="display mt-8 text-[2.75rem] text-ink sm:text-[3.5rem]">Something broke.</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted">
          An unexpected error interrupted Cadence. You can retry, or head back home.
        </p>
        {error.digest && <p className="mt-3 font-mono text-xs text-faint">Ref: {error.digest}</p>}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
