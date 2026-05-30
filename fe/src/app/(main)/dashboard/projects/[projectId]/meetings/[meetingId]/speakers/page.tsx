import { notFound } from "next/navigation";

import { getMeetingById, listSpeakers } from "@/server/queries/meeting-queries";

import { SpeakersClient } from "./speakers-client";

export default async function SpeakersPage({ params }: { params: Promise<{ projectId: string; meetingId: string }> }) {
  const { meetingId } = await params;

  const [meeting, speakers] = await Promise.all([
    getMeetingById(meetingId).catch(() => null),
    listSpeakers(meetingId).catch(() => []),
  ]);

  if (!meeting) {
    notFound();
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SpeakersClient meetingId={meetingId} initialSpeakers={speakers} />
    </div>
  );
}
