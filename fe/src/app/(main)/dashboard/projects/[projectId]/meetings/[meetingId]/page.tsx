import Link from "next/link";
import { notFound } from "next/navigation";

import { Captions, CheckSquare, FileText } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMeetingByIdAction, getMeetingStatusAction } from "@/server/api-actions";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string; meetingId: string }> }) {
  const { meetingId } = await params;
  const meeting = await getMeetingByIdAction(meetingId).catch(() => null);
  return { title: meeting ? `${meeting.title} - Smart Secretary` : "Meeting Overview" };
}

export default async function MeetingOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { projectId, meetingId } = await params;

  const meeting = await getMeetingByIdAction(meetingId).catch(() => null);
  if (!meeting) {
    notFound();
  }

  const status = await getMeetingStatusAction(meetingId).catch(() => null);
  if (!status) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Meeting summary</CardTitle>
          <CardDescription>Draft metadata and lifecycle controls for this meeting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3 bg-muted/10">
              <p className="text-muted-foreground text-xs">Meeting ID</p>
              <p className="mt-1 break-all font-mono text-xs">{meeting.id}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/10">
              <p className="text-muted-foreground text-xs">Project ID</p>
              <p className="mt-1 break-all font-mono text-xs">{meeting.project_id}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/10">
              <p className="text-muted-foreground text-xs">Files uploaded</p>
              <p className="mt-1 font-semibold">{status.file_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Review workspace</CardTitle>
          <CardDescription>Open transcript, summary, and action items work areas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Link
            href={`/dashboard/projects/${projectId}/meetings/${meetingId}/transcript`}
            className="rounded-lg border p-4 transition-all hover:bg-muted/30 hover:border-primary/50 group"
          >
            <p className="inline-flex items-center gap-2 font-medium text-sm group-hover:text-primary transition-colors">
              <Captions className="size-5" />
              Transcript
            </p>
            <p className="mt-2 text-muted-foreground text-xs">Review and edit transcript segments.</p>
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/meetings/${meetingId}/summary`}
            className="rounded-lg border p-4 transition-all hover:bg-muted/30 hover:border-primary/50 group"
          >
            <p className="inline-flex items-center gap-2 font-medium text-sm group-hover:text-primary transition-colors">
              <FileText className="size-5" />
              Summary
            </p>
            <p className="mt-2 text-muted-foreground text-xs">Read and update meeting summary.</p>
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/meetings/${meetingId}/action-items`}
            className="rounded-lg border p-4 transition-all hover:bg-muted/30 hover:border-primary/50 group"
          >
            <p className="inline-flex items-center gap-2 font-medium text-sm group-hover:text-primary transition-colors">
              <CheckSquare className="size-5" />
              Action items
            </p>
            <p className="mt-2 text-muted-foreground text-xs">Track meeting tasks and assignees.</p>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
