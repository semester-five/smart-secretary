import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, Captions } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMeetingByIdAction, getTranscriptAction } from "@/server/api-actions";

import { TranscriptClient } from "./transcript-client";

export default async function TranscriptPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { projectId, meetingId } = await params;

  const [meeting, transcript] = await Promise.all([
    getMeetingByIdAction(meetingId).catch(() => null),
    getTranscriptAction(meetingId).catch(() => null),
  ]);

  if (!meeting || !transcript) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <Link
          href={`/dashboard/projects/${projectId}/meetings/${meetingId}`}
          className="inline-flex items-center font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to meeting
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Transcript</h1>
          <p className="mt-1 text-muted-foreground text-sm">{meeting.title}</p>
        </div>
        <Badge variant="secondary">Version {transcript.version_no}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Captions className="size-5" />
            Transcript segments
          </CardTitle>
          <CardDescription>Review transcript metadata and edit content below.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Segments: {transcript.segments.length} · Speakers: {transcript.speakers.length}
          </p>
        </CardContent>
      </Card>

      <TranscriptClient meetingId={meetingId} transcript={transcript} />
    </div>
  );
}
