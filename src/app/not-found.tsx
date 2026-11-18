import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-paper px-5 text-center">
      <div className="flex max-w-md flex-col items-center">
        <LogoMark className="size-12" />
        <p className="eyebrow mt-8">Error 404</p>
        <h1 className="display text-gradient mt-3 pb-1 text-[2.75rem] sm:text-[3.5rem]">Off schedule.</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted">
          We couldn&apos;t find that page. It may have moved, or it belongs to another account.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/dashboard">Open Studio</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
