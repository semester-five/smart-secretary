import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "@/lib/icons";
import {
  getMeetingById,
  getMeetingSummary,
} from "@/server/queries/meeting-queries";

import { SummaryClient } from "./summary-client";

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const { meetingId } = await params;

  const [meeting, summary] = await Promise.all([
    getMeetingById(meetingId).catch(() => null),
    getMeetingSummary(meetingId).catch(() => null),
  ]);

  if (!meeting) {
    notFound();
  }

  return (
    <div className="fade-in slide-in-from-bottom-4 animate-in space-y-6 duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Meeting summary
          </CardTitle>
          <CardDescription>
            Review summary metadata and edit content below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary ? (
            <p className="text-muted-foreground text-sm">
              Current version: {summary.version_no}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <SummaryClient meetingId={meetingId} initialSummary={summary} />
    </div>
  );
}
