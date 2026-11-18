import { Skeleton } from "@/components/ui/display";

/** Studio-shaped skeleton: header, composer card, then a two-column feed + side column. */
export default function DashboardLoading() {
  return (
    <div className="container-app pt-10 md:pt-14" aria-busy aria-label="Loading your studio">
      <Skeleton className="h-4 w-28 rounded-full" />
      <Skeleton className="mt-4 h-11 w-80 max-w-full rounded-xl md:h-14" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full rounded-full" />

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-3xl" />
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-line bg-surface p-5 shadow-soft md:p-8">
        <Skeleton className="h-4 w-36 rounded-full" />
        <Skeleton className="mt-4 h-28 w-full rounded-2xl" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="ml-auto h-11 w-36 rounded-full" />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-4 w-full rounded-full" />
              <Skeleton className="mt-2 h-4 w-4/5 rounded-full" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
