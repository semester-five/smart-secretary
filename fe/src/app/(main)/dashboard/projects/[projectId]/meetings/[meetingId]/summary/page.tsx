import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, FileText } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMeetingByIdAction, getMeetingSummaryAction } from "@/server/api-actions";

import { SummaryClient } from "./summary-client";

export default async function SummaryPage({ params }: { params: Promise<{ projectId: string; meetingId: string }> }) {
  const { projectId, meetingId } = await params;

  const [meeting, summary] = await Promise.all([
    getMeetingByIdAction(meetingId).catch(() => null),
    getMeetingSummaryAction(meetingId).catch(() => null),
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
        <h1 className="font-semibold text-2xl tracking-tight">Summary</h1>
        <p className="mt-1 text-muted-foreground text-sm">{meeting.title}</p>
      </div>

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
