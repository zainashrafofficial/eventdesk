import { Skeleton } from "@/components/ui/display";

export default function DashboardLoading() {
  return (
    <div className="container-app pt-12" aria-busy aria-label="Loading">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-12 w-72 max-w-full" />
      <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
