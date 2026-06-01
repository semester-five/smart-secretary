"use client";

import { useCallback, useMemo, useState } from "react";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, CalendarX, ClipboardPlus } from "@/lib/icons";
import type { Meeting, Project } from "@/server/api-actions";

import { CreateMeetingForm } from "./create-meeting-form";

type MeetingsClientProps = {
  project: Project;
  initialMeetings: Meeting[];
};

export function MeetingsClient({
  project,
  initialMeetings,
}: MeetingsClientProps) {
  const [meetings, setMeetings] = useState(initialMeetings);

  const sortedMeetings = useMemo(
    () =>
      [...meetings].sort(
        (first, second) =>
          new Date(second.meeting_date).getTime() -
          new Date(first.meeting_date).getTime(),
      ),
    [meetings],
  );

  const handleCreated = useCallback((meeting: Meeting) => {
    setMeetings((current) => {
      const withoutDuplicate = current.filter((item) => item.id !== meeting.id);
      return [meeting, ...withoutDuplicate];
    });
  }, []);

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardPlus className="size-5" />
            Create meeting draft
          </CardTitle>
          <CardDescription>
            Create a meeting record before uploading audio and starting
            processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateMeetingForm projectId={project.id} onCreated={handleCreated} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Meeting timeline
          </CardTitle>
          <CardDescription>
            View upcoming and past meetings scheduled for this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedMeetings.length > 0 ? (
            sortedMeetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/dashboard/projects/${project.id}/meetings/${meeting.id}`}
                className="block rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold">{meeting.title}</p>
                    <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
                      <Calendar className="size-3.5" />
                      {new Date(meeting.meeting_date).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      meeting.status === "processing" ? "default" : "secondary"
                    }
                  >
                    {meeting.status}
                  </Badge>
                </div>
              </Link>
            ))
          ) : (
            <div className="fade-in zoom-in-95 flex animate-in flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center duration-500">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted shadow-sm">
                <CalendarX className="size-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-base">No meetings scheduled</p>
              <p className="mt-1 max-w-sm text-muted-foreground text-sm">
                Get started by creating a new meeting draft above. Once created,
                you can upload meeting audio for processing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
