import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the meeting detail layout (which fetches meeting data)
 * and the active meeting sub-page are loading.
 */
export default function MeetingDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-5 w-40" />

      {/* Meeting title + date + badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      {/* Tabs row */}
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton only
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>

      {/* Content area */}
      <div className="rounded-xl border p-6 space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
