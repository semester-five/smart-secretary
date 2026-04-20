"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createMeetingVersionAction,
  renameSpeakerAction,
  type Transcript,
  updateTranscriptSegmentAction,
} from "@/server/api-actions";

export function TranscriptClient({ meetingId, transcript }: { meetingId: string; transcript: Transcript }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savingSegmentId, setSavingSegmentId] = useState<string | null>(null);
  const [renamingSpeakerId, setRenamingSpeakerId] = useState<string | null>(null);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  const initialSegmentDrafts = useMemo(
    () => Object.fromEntries(transcript.segments.map((segment) => [segment.id, segment.text])),
    [transcript.segments],
  );
  const [segmentDrafts, setSegmentDrafts] = useState<Record<string, string>>(initialSegmentDrafts);

  const initialSpeakerDrafts = useMemo(
    () =>
      Object.fromEntries(
        transcript.speakers.map((speaker) => [speaker.id, speaker.display_name ?? speaker.speaker_label]),
      ),
    [transcript.speakers],
  );
  const [speakerDrafts, setSpeakerDrafts] = useState<Record<string, string>>(initialSpeakerDrafts);
  const [changeNote, setChangeNote] = useState("");

  const saveSegment = (segmentId: string) => {
    const text = (segmentDrafts[segmentId] ?? "").trim();
    if (!text) {
      toast.error("Transcript text cannot be empty.");
      return;
    }

    startTransition(async () => {
      try {
        setSavingSegmentId(segmentId);
        await updateTranscriptSegmentAction(meetingId, segmentId, text);
        toast.success("Segment updated.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update segment.");
      } finally {
        setSavingSegmentId(null);
      }
    });
  };

  const renameSpeaker = (speakerId: string) => {
    const displayName = (speakerDrafts[speakerId] ?? "").trim();
    if (!displayName) {
      toast.error("Speaker name cannot be empty.");
      return;
    }

    startTransition(async () => {
      try {
        setRenamingSpeakerId(speakerId);
        await renameSpeakerAction(meetingId, speakerId, displayName);
        toast.success("Speaker renamed.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to rename speaker.");
      } finally {
        setRenamingSpeakerId(null);
      }
    });
  };

  const snapshotVersion = () => {
    startTransition(async () => {
      try {
        setIsCreatingVersion(true);
        await createMeetingVersionAction(meetingId, {
          from_version: transcript.version_no,
          change_note: changeNote || "Manual transcript edits",
        });
        toast.success("New version snapshot created.");
        setChangeNote("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create version.");
      } finally {
        setIsCreatingVersion(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Speakers</CardTitle>
          <CardDescription>Rename speaker labels to confirmed display names.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {transcript.speakers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No speakers detected yet.</p>
          ) : (
            transcript.speakers.map((speaker) => (
              <div key={speaker.id} className="grid gap-2 md:grid-cols-[1fr_auto]">
                <Input
                  value={speakerDrafts[speaker.id] ?? ""}
                  onChange={(event) => {
                    setSpeakerDrafts((current) => ({ ...current, [speaker.id]: event.target.value }));
                  }}
                  placeholder={speaker.speaker_label}
                />
                <Button
                  type="button"
                  disabled={isPending && renamingSpeakerId === speaker.id}
                  onClick={() => renameSpeaker(speaker.id)}
                >
                  {isPending && renamingSpeakerId === speaker.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Rename"
                  )}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segments</CardTitle>
          <CardDescription>Edit transcript text and save each segment independently.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {transcript.segments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No transcript data yet.</p>
          ) : (
            transcript.segments.map((segment) => (
              <div key={segment.id} className="space-y-3 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
                  <span>{segment.speaker_label}</span>
                  <span>
                    {Math.floor(segment.start_ms / 1000)}s - {Math.floor(segment.end_ms / 1000)}s
                  </span>
                </div>
                <Textarea
                  value={segmentDrafts[segment.id] ?? ""}
                  onChange={(event) => {
                    setSegmentDrafts((current) => ({ ...current, [segment.id]: event.target.value }));
                  }}
                  rows={3}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending && savingSegmentId === segment.id}
                  onClick={() => saveSegment(segment.id)}
                >
                  {isPending && savingSegmentId === segment.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save segment
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version snapshot</CardTitle>
          <CardDescription>Create a new meeting version after manual transcript changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={changeNote}
            onChange={(event) => setChangeNote(event.target.value)}
            placeholder="Change note (optional)"
          />
          <Button type="button" disabled={isPending && isCreatingVersion} onClick={snapshotVersion}>
            {isPending && isCreatingVersion ? <Loader2 className="size-4 animate-spin" /> : null}
            Create version
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
