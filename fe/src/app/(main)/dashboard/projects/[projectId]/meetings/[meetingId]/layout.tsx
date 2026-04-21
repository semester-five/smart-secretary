import type { ReactNode } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getMeetingByIdAction } from "@/server/api-actions";

import { MeetingTabs, type MeetingTab } from "../_components/meeting-tabs";

export default async function MeetingLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ projectId: string; meetingId: string }>;
}>) {
  const { projectId, meetingId } = await params;

  const meeting = await getMeetingByIdAction(meetingId).catch(() => null);
  if (!meeting) {
    notFound();
  }

  const tabs: MeetingTab[] = [
    {
      title: "Overview",
      href: `/dashboard/projects/${projectId}/meetings/${meetingId}`,
      iconKey: "overview",
      exact: true,
    },
    {
      title: "Audio & Processing",
      href: `/dashboard/projects/${projectId}/meetings/${meetingId}/audio`,
      iconKey: "audio",
    },
    {
      title: "Transcript",
      href: `/dashboard/projects/${projectId}/meetings/${meetingId}/transcript`,
      iconKey: "transcript",
    },
    {
      title: "Summary",
      href: `/dashboard/projects/${projectId}/meetings/${meetingId}/summary`,
      iconKey: "summary",
    },
    {
      title: "Action Items",
      href: `/dashboard/projects/${projectId}/meetings/${meetingId}/action-items`,
      iconKey: "action-items",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <Link
          href={`/dashboard/projects/${projectId}/meetings`}
          className="inline-flex items-center font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to all meetings
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">
            {meeting.title}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {new Date(meeting.meeting_date).toLocaleString()}
          </p>
        </div>
        <Badge
          variant={meeting.status === "processing" ? "default" : "secondary"}
        >
          {meeting.status}
        </Badge>
      </div>

      <MeetingTabs tabs={tabs} />

      <div>{children}</div>
    </div>
  );
}
