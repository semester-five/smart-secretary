import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown instantly while the projects list fetches data.
 */
export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton only
          <div key={i} className="rounded-xl border overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
