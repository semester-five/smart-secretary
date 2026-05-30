import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown instantly while the dashboard default page loads.
 * Prevents the blank screen during the 2s render time.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-6 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="rounded-xl border p-6 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </div>
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
