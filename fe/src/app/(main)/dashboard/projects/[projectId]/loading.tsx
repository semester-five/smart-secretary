import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown instantly while the project detail page fetches data.
 */
export default function ProjectDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton only
          <div key={i} className="rounded-xl border p-6 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>

      {/* Get started card */}
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}
