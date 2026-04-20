import Link from "next/link";

import { ArrowLeft, Calendar, CalendarX, ClipboardPlus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectByIdAction, listProjectMeetingsAction } from "@/server/api-actions";

import { CreateMeetingForm } from "./_components/create-meeting-form";

export const metadata = {
  title: "Meetings - Smart Secretary",
};

export default async function ProjectMeetingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const [project, meetings] = await Promise.all([
    getProjectByIdAction(projectId).catch(() => null),
    listProjectMeetingsAction(projectId).catch(() => []),
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
          Back to configuration
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

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardPlus className="size-5" />
            Create meeting draft
          </CardTitle>
          <CardDescription>Create a meeting record before uploading audio and starting processing.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateMeetingForm projectId={project.id} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Meeting timeline
          </CardTitle>
          <CardDescription>View upcoming and past meetings scheduled for this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {meetings.length > 0 ? (
            meetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/dashboard/projects/${project.id}/meetings/${meeting.id}`}
                className="block rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold">{meeting.title}</p>
                    <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
                      <Calendar className="size-3.5" />
                      {new Date(meeting.meeting_date).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={meeting.status === "processing" ? "default" : "secondary"}>{meeting.status}</Badge>
                </div>
              </Link>
            ))
          ) : (
            <div className="fade-in zoom-in-95 flex animate-in flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center duration-500">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted shadow-sm">
                <CalendarX className="size-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-base">No meetings scheduled</p>
              <p className="mt-1 max-w-sm text-muted-foreground text-sm">
                Get started by creating a new meeting draft above. Once created, you can upload meeting audio for
                processing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
