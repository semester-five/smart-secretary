import { notFound } from "next/navigation";

import { getMeetingByIdAction, getMeetingStatusAction } from "@/server/api-actions";

import { MeetingDetailClient } from "../../_components/meeting-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string; meetingId: string }> }) {
  const { meetingId } = await params;
  const meeting = await getMeetingByIdAction(meetingId).catch(() => null);
  return { title: meeting ? `Audio: ${meeting.title} - Smart Secretary` : "Meeting Audio" };
}

export default async function MeetingAudioPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { meetingId } = await params;

  const meeting = await getMeetingByIdAction(meetingId).catch(() => null);
  if (!meeting) {
    notFound();
  }

  const status = await getMeetingStatusAction(meetingId).catch(() => null);
  if (!status) {
    notFound();
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <MeetingDetailClient meeting={meeting} initialStatus={status} />
    </div>
  );
}
