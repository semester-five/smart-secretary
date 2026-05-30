import { notFound } from "next/navigation";

import { getMeetingById, getMeetingStatus, getTranscript } from "@/server/queries/meeting-queries";

import { TranscriptClient } from "./transcript-client";
import { TranscriptStatusWatcher } from "./transcript-status-watcher";

export default async function TranscriptPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { meetingId } = await params;

  const [meeting, transcript, status] = await Promise.all([
    getMeetingById(meetingId).catch(() => null),
    getTranscript(meetingId).catch(() => null),
    getMeetingStatus(meetingId).catch(() => null),
  ]);

  if (!meeting) {
    notFound();
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {status ? (
        <TranscriptStatusWatcher
          meetingId={meetingId}
          initialStatus={status}
          showPanel={!transcript || status.meeting_status === "processing"}
        />
      ) : null}
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
