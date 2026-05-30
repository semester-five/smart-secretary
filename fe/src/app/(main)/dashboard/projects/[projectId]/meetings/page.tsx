import Link from "next/link";

import { ArrowLeft, Search } from "@/lib/icons";
import { getProjectById, listProjectMeetings } from "@/server/queries/project-queries";

import { MeetingsClient } from "./_components/meetings-client";

export const metadata = {
  title: "Meetings - Smart Secretary",
};

export default async function ProjectMeetingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const [project, meetings] = await Promise.all([
    getProjectById(projectId).catch(() => null),
    listProjectMeetings(projectId).catch(() => []),
  ]);

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="font-semibold text-2xl">Meetings</h1>
        <p className="text-muted-foreground text-sm">Project not found or no permission.</p>
      </div>
    );
  }

  return (
    <div className="fade-in slide-in-from-bottom-4 animate-in space-y-6 duration-500">
      <div className="mb-2">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="inline-flex items-center font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to overview
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Meetings</h1>
          <p className="mt-1 text-muted-foreground text-sm">{project.name}</p>
        </div>
        <Link href={`/dashboard/projects/${project.id}/meetings/search`}>
          <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/30">
            <Search className="size-4" />
            Search &amp; filter
          </span>
        </Link>
      </div>

      <MeetingsClient project={project} initialMeetings={meetings} />
    </div>
  );
}
