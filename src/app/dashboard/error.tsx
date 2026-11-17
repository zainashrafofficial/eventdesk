"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Error boundary for the signed-in area: the shell stays, only the page is replaced. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-app flex flex-col items-center py-24 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert className="size-5" />
      </span>
      <h1 className="serif mt-5 text-3xl text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        We couldn't load this page. Check your connection and try again.
        {error.digest && <span className="mt-2 block font-mono text-xs text-faint">Ref: {error.digest}</span>}
      </p>
      <Button className="mt-6" onClick={reset}>
        <RotateCw /> Try again
      </Button>
    </div>
  );
}
