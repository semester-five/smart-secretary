import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Captions, CheckSquare, Download, FileText } from "@/lib/icons";
import {
  getMeetingById,
  getMeetingStatus,
} from "@/server/queries/meeting-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { meetingId } = await params;
  // getMeetingById uses React cache() — deduplicated with the page component below.
  const meeting = await getMeetingById(meetingId).catch(() => null);
  return {
    title: meeting ? `${meeting.title} - Smart Secretary` : "Meeting Overview",
  };
}

export default async function MeetingOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { projectId, meetingId } = await params;

  // Both calls are parallel and getMeetingById is deduplicated with:
  // 1. generateMetadata above
  // 2. meeting/[meetingId]/layout.tsx
  const [meeting, status] = await Promise.all([
    getMeetingById(meetingId).catch(() => null),
    getMeetingStatus(meetingId).catch(() => null),
  ]);

  if (!meeting) {
    notFound();
  }

  if (!status) {
    notFound();
  }

  return (
    <div className="fade-in slide-in-from-bottom-4 animate-in space-y-6 duration-500">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Meeting summary</CardTitle>
          <CardDescription>
            Draft metadata and lifecycle controls for this meeting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-muted/10 p-3">
              <p className="text-muted-foreground text-xs">Meeting ID</p>
              <p className="mt-1 break-all font-mono text-xs">{meeting.id}</p>
            </div>
            <div className="rounded-lg border bg-muted/10 p-3">
              <p className="text-muted-foreground text-xs">Project ID</p>
              <p className="mt-1 break-all font-mono text-xs">
                {meeting.project_id}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/10 p-3">
              <p className="text-muted-foreground text-xs">Files uploaded</p>
              <p className="mt-1 font-semibold">{status.file_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Review workspace</CardTitle>
          <CardDescription>
            Open transcript, summary, and action items work areas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Link
            href={`/dashboard/projects/${projectId}/meetings/${meetingId}/transcript`}
            className="group rounded-lg border p-4 transition-all hover:border-primary/50 hover:bg-muted/30"
          >
            <p className="inline-flex items-center gap-2 font-medium text-sm transition-colors group-hover:text-primary">
              <Captions className="size-5" />
              Transcript
            </p>
            <p className="mt-2 text-muted-foreground text-xs">
              Review and edit transcript segments.
            </p>
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/meetings/${meetingId}/summary`}
            className="group rounded-lg border p-4 transition-all hover:border-primary/50 hover:bg-muted/30"
          >
            <p className="inline-flex items-center gap-2 font-medium text-sm transition-colors group-hover:text-primary">
              <FileText className="size-5" />
              Summary
            </p>
            <p className="mt-2 text-muted-foreground text-xs">
              Read and update meeting summary.
            </p>
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/meetings/${meetingId}/action-items`}
            className="group rounded-lg border p-4 transition-all hover:border-primary/50 hover:bg-muted/30"
          >
            <p className="inline-flex items-center gap-2 font-medium text-sm transition-colors group-hover:text-primary">
              <CheckSquare className="size-5" />
              Action items
            </p>
            <p className="mt-2 text-muted-foreground text-xs">
              Track meeting tasks and assignees.
            </p>
          </Link>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Export official minutes</CardTitle>
          <CardDescription>
            Download a meeting record with summary, key points, decisions,
            tasks, and transcript.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full gap-2 sm:w-auto">
            <a href={`/api/client/meetings/${meetingId}/export?format=pdf`}>
              <Download className="size-4" />
              PDF
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
            <a href={`/api/client/meetings/${meetingId}/export?format=docx`}>
              <Download className="size-4" />
              DOCX
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
