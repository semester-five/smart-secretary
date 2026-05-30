import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown instantly while the meetings list page fetches project + meetings data.
 */
export default function MeetingsLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-5 w-36" />

      {/* Title row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* Create meeting card */}
      <div className="rounded-xl border p-6 space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Meeting timeline card */}
      <div className="rounded-xl border p-6 space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton only
            <div key={i} className="rounded-lg border p-4 flex items-start justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
