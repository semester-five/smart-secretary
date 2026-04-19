"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMeetingAction } from "@/server/api-actions";

export function CreateMeetingForm({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    if (!title.trim()) {
      toast.error("Meeting title is required.");
      return;
    }
    if (!meetingDate) {
      toast.error("Meeting date is required.");
      return;
    }

    startTransition(async () => {
      try {
        const meeting = await createMeetingAction({
          project_id: projectId,
          title: title.trim(),
          meeting_date: new Date(meetingDate).toISOString(),
        });
        toast.success("Meeting created.");
        setTitle("");
        setMeetingDate("");
        router.push(`/dashboard/projects/${projectId}/meetings/${meeting.id}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create meeting.");
      }
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-1.5">
        <label htmlFor="meeting-title" className="font-medium text-sm text-foreground">
          Title
        </label>
        <Input
          id="meeting-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Weekly Sync, Design Review"
          className="transition-colors hover:border-muted-foreground/50 focus-visible:ring-1"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="meeting-date" className="font-medium text-sm text-foreground">
          Meeting date
        </label>
        <Input
          id="meeting-date"
          type="datetime-local"
          value={meetingDate}
          onChange={(event) => setMeetingDate(event.target.value)}
          className="block w-full transition-colors hover:border-muted-foreground/50 focus-visible:ring-1 [color-scheme:light_dark]"
        />
      </div>
      <Button
        type="button"
        disabled={isPending}
        onClick={submit}
        className="w-full md:w-auto font-medium transition-all"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Plus className="mr-2 size-4" />
            Create meeting
          </>
        )}
      </Button>
    </div>
  );
}
