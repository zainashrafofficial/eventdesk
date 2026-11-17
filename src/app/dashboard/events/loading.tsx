import { Skeleton } from "@/components/ui/display";

export default function EventsLoading() {
  return (
    <div className="container-app pt-12" aria-busy aria-label="Loading events">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-4 h-12 w-64 max-w-full" />
      <Skeleton className="mt-10 h-16 rounded-2xl" />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
