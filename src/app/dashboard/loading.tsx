import { Skeleton } from "@/components/ui/display";

/** Studio-shaped skeleton: header, widget tiles, generator card, then feed + side column. */
export default function DashboardLoading() {
  return (
    <div className="container-app pt-8 pb-16 sm:pt-12" aria-busy aria-label="Loading your studio">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3.5 w-28 rounded-full" />
          <Skeleton className="mt-4 h-10 w-[22rem] max-w-full rounded-xl sm:h-12 lg:h-14 lg:w-[30rem]" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full rounded-full" />
        </div>
        <Skeleton className="h-10 w-36 shrink-0 rounded-full" />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass flex flex-col justify-between gap-5 rounded-[26px] border border-line p-4 shadow-soft sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-20 rounded-full" />
              <Skeleton className="size-8 rounded-xl sm:size-9" />
            </div>
            <Skeleton className="h-7 w-12 rounded-lg sm:h-8" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          <div className="glass rounded-[28px] border border-line p-5 shadow-soft sm:p-7">
            <Skeleton className="h-3 w-14 rounded-full" />
            <Skeleton className="mt-3 h-6 w-48 rounded-lg" />
            <Skeleton className="mt-6 h-28 w-full rounded-2xl" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Skeleton className="h-8 w-44 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
            </div>
            <Skeleton className="mt-6 h-12 w-full rounded-2xl" />
            <div className="mt-6 flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-full" />
              ))}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-4 w-64 max-w-full rounded-full" />
              <Skeleton className="h-11 w-full rounded-full sm:w-44" />
            </div>
          </div>

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
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Skeleton className="h-40 rounded-[26px]" />
          <Skeleton className="h-56 rounded-[26px]" />
          <Skeleton className="h-48 rounded-[26px]" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
