import { notFound } from "next/navigation";

import { getMeetingById, listActionItems } from "@/server/queries/meeting-queries";

import { ActionItemsClient } from "./action-items-client";

export default async function ActionItemsPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { meetingId } = await params;

  const [meeting, actionItems] = await Promise.all([
    getMeetingById(meetingId).catch(() => null),
    listActionItems(meetingId).catch(() => []),
  ]);

  if (!meeting) {
    notFound();
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ActionItemsClient meetingId={meetingId} initialItems={actionItems} />
    </div>
  );
}
