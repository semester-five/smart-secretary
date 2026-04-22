import { notFound } from "next/navigation";

import { getMeetingByIdAction, listActionItemsAction } from "@/server/api-actions";

import { ActionItemsClient } from "./action-items-client";

export default async function ActionItemsPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { meetingId } = await params;

  const [meeting, actionItems] = await Promise.all([
    getMeetingByIdAction(meetingId).catch(() => null),
    listActionItemsAction(meetingId).catch(() => []),
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
