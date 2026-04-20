import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, CheckSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMeetingByIdAction, listActionItemsAction } from "@/server/api-actions";

import { ActionItemsClient } from "./action-items-client";

export default async function ActionItemsPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { projectId, meetingId } = await params;

  const [meeting, actionItems] = await Promise.all([
    getMeetingByIdAction(meetingId).catch(() => null),
    listActionItemsAction(meetingId).catch(() => []),
  ]);

  if (!meeting) {
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

      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Action Items</h1>
        <p className="mt-1 text-muted-foreground text-sm">{meeting.title}</p>
      </div>

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
