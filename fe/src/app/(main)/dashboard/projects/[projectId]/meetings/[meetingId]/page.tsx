import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMeetingByIdAction, getMeetingStatusAction } from "@/server/api-actions";

import { MeetingDetailClient } from "../_components/meeting-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string; meetingId: string }> }) {
  const { meetingId } = await params;
  const meeting = await getMeetingByIdAction(meetingId).catch(() => null);
  return { title: meeting ? `${meeting.title} - Smart Secretary` : "Meeting Details" };
}

export default async function MeetingDetailPage({
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
    <div className="space-y-6">
      <div className="mb-2">
        <Link
          href={`/dashboard/projects/${projectId}/meetings`}
          className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to meetings
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">{meeting.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{new Date(meeting.meeting_date).toLocaleString()}</p>
        </div>
        <Badge variant={meeting.status === "processing" ? "default" : "secondary"}>{meeting.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meeting summary</CardTitle>
          <CardDescription>Draft metadata and lifecycle controls for this meeting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Meeting ID</p>
              <p className="mt-1 font-mono text-xs break-all">{meeting.id}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Project ID</p>
              <p className="mt-1 font-mono text-xs break-all">{meeting.project_id}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Files</p>
              <p className="mt-1 font-semibold">{status.file_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <MeetingDetailClient meeting={meeting} initialStatus={status} />
    </div>
  );
}
