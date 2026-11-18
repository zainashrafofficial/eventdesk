"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Error boundary for the signed-in area: the top bar stays, only the studio is replaced. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-app py-20 md:py-28">
      <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-line bg-surface px-6 py-12 text-center shadow-soft">
        <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert className="size-5" />
        </span>
        <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.025em] text-ink">Your studio didn&apos;t load</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Something went wrong on our side. Your posts are safe. Try again in a moment.
        </p>
        {error.digest && <p className="mt-3 font-mono text-xs text-faint">Ref: {error.digest}</p>}
        <Button className="mt-7" onClick={reset}>
          <RotateCw /> Try again
        </Button>
      </div>
    </div>
  );
}
