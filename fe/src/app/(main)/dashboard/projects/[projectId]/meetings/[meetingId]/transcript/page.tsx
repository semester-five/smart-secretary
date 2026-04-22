import { notFound } from "next/navigation";

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

  if (!meeting) {
    notFound();
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {transcript ? (
        <TranscriptClient meetingId={meetingId} transcript={transcript} />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
          <p className="font-semibold text-muted-foreground">Transcript not available</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            The meeting may still be processing. Check back after processing completes.
          </p>
        </div>
      )}
    </div>
  );
}
