import { Skeleton } from "@/components/ui/display";

export default function EventLoading() {
  return (
    <div className="container-app pt-8" aria-busy aria-label="Loading event">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-5 h-96 rounded-3xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
