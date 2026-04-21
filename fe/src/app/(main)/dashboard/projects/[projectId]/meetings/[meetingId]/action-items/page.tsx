import { notFound } from "next/navigation";

import { CheckSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="size-5" />
            Task list
          </CardTitle>
          <CardDescription>Review task overview and manage details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Total: {actionItems.length}</Badge>
          </div>
        </CardContent>
      </Card>

      <ActionItemsClient meetingId={meetingId} initialItems={actionItems} />
    </div>
  );
}
