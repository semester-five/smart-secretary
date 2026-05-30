"use client";

import { useEffect, useRef } from "react";

import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { clientGetMeetingStatus } from "@/data/api-client";
import type { MeetingStatus } from "@/server/api-actions";

export function TranscriptStatusWatcher({
  meetingId,
  initialStatus,
  showPanel,
}: {
  readonly meetingId: string;
  readonly initialStatus: MeetingStatus;
  readonly showPanel: boolean;
}) {
  const router = useRouter();
  const didRefreshRef = useRef(false);

  const { data: status } = useQuery({
    queryKey: ["meeting-status", meetingId],
    queryFn: () => clientGetMeetingStatus(meetingId),
    initialData: initialStatus,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.meeting_status === "processing") return 3000;
      if (data?.latest_job?.status === "queued" || data?.latest_job?.status === "running") return 3000;
      return false;
    },
    retry: 1,
  });

  useEffect(() => {
    if (didRefreshRef.current) return;
    if (status.meeting_status === "completed" || status.latest_job?.status === "completed") {
      didRefreshRef.current = true;
      router.refresh();
    }
    if (status.meeting_status === "failed" || status.latest_job?.status === "failed") {
      didRefreshRef.current = true;
      router.refresh();
    }
  }, [router, status.latest_job?.status, status.meeting_status]);

  if (!showPanel) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Transcript processing</span>
          <Badge variant={status.meeting_status === "failed" ? "destructive" : "secondary"}>
            {status.meeting_status}
          </Badge>
        </CardTitle>
        <CardDescription>This page will refresh automatically when the transcript is ready.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Job progress</span>
          <span className="text-muted-foreground capitalize">{status.latest_job?.status ?? "idle"}</span>
        </div>
        <Progress value={status.latest_job?.progress ?? 0} className="h-2" />
      </CardContent>
    </Card>
  );
}
