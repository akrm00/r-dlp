import { Skeleton } from "@/components/ui/skeleton";

export function AnalyzeLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="bg-card border-hairline floating flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row">
        <Skeleton className="aspect-video w-full shrink-0 rounded-xl sm:w-56" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-9 w-56 rounded-full" />
        </div>
        <div className="bg-card border-hairline floating space-y-1 rounded-2xl border p-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
