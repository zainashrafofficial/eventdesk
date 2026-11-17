import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  searchParams,
}: {
  page: number;
  pageCount: number;
  searchParams: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== "page") qs.set(k, v);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `?${s}` : "?";
  };

  const linkClass =
    "inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-line-strong";

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass}>
          <ChevronLeft className="size-4" /> Previous
        </Link>
      ) : (
        <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-disabled>
          <ChevronLeft className="size-4" /> Previous
        </span>
      )}
      <span className="text-sm text-muted tabular">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className={linkClass}>
          Next <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-disabled>
          Next <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
