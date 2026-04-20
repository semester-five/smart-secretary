import { notFound } from "next/navigation";

import { Captions } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMeetingByIdAction, getTranscriptAction } from "@/server/api-actions";

import { TranscriptClient } from "./transcript-client";

export default async function TranscriptPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { meetingId } = await params;

  const [meeting, transcript] = await Promise.all([
    getMeetingByIdAction(meetingId).catch(() => null),
    getTranscriptAction(meetingId).catch(() => null),
  ]);

  if (!meeting || !transcript) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

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
