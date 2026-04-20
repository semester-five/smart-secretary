import { notFound } from "next/navigation";

import { FileText } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMeetingByIdAction, getMeetingSummaryAction } from "@/server/api-actions";

import { SummaryClient } from "./summary-client";

export default async function SummaryPage({ params }: { params: Promise<{ projectId: string; meetingId: string }> }) {
  const { meetingId } = await params;

  const [meeting, summary] = await Promise.all([
    getMeetingByIdAction(meetingId).catch(() => null),
    getMeetingSummaryAction(meetingId).catch(() => null),
  ]);

  if (!meeting) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Meeting summary
          </CardTitle>
          <CardDescription>Review summary metadata and edit content below.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary ? <p className="text-muted-foreground text-sm">Current version: {summary.version_no}</p> : null}
        </CardContent>
      </Card>

      <SummaryClient meetingId={meetingId} initialSummary={summary} />
    </div>
  );
}
