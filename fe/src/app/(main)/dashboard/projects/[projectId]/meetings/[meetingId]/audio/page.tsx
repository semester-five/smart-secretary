import { notFound } from "next/navigation";

import { getMeetingById, getMeetingStatus } from "@/server/queries/meeting-queries";

import { MeetingDetailClient } from "../../_components/meeting-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string; meetingId: string }> }) {
  const { meetingId } = await params;
  // getMeetingById uses React cache() — deduplicated with the page component below.
  const meeting = await getMeetingById(meetingId).catch(() => null);
  return {
    title: meeting ? `Audio: ${meeting.title} - Smart Secretary` : "Meeting Audio",
  };
}

export default async function MeetingAudioPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { meetingId } = await params;

  // Run in parallel; getMeetingById is deduped with generateMetadata and layout.
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <MeetingDetailClient meeting={meeting} initialStatus={status} />
    </div>
  );
}
