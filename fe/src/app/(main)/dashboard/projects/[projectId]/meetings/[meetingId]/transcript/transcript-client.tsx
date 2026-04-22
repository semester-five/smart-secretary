"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import {
  createMeetingVersionAction,
  renameSpeakerAction,
  type Transcript,
  type TranscriptSegment,
  updateTranscriptSegmentAction,
} from "@/server/api-actions";

import { ChatBubble, formatMs, SPEAKER_COLORS } from "./_components/chat-bubble";
import { SpeakerPanel } from "./_components/speaker-panel";
import { VersionPanel } from "./_components/version-panel";

// ─── Gap threshold for time separator (ms) ────────────────────────────────────
const TIME_SEPARATOR_GAP_MS = 60_000;

export function TranscriptClient({ meetingId, transcript }: { meetingId: string; transcript: Transcript }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [savingSegmentId, setSavingSegmentId] = useState<string | null>(null);
  const [renamingSpeakerId, setRenamingSpeakerId] = useState<string | null>(null);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  // Editable segment text drafts (reflects latest server text initially)
  const [segmentDrafts, setSegmentDrafts] = useState<Record<string, string>>(
    () => Object.fromEntries(transcript.segments.map((s) => [s.id, s.text])),
  );

  // Editable speaker display name drafts
  const [speakerDrafts, setSpeakerDrafts] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        transcript.speakers.map((sp) => [sp.id, sp.display_name ?? sp.speaker_label]),
      ),
  );

  // Speaker colors – local state only (not persisted to backend)
  const [speakerColors, setSpeakerColors] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        transcript.speakers.map((sp, idx) => [sp.id, SPEAKER_COLORS[idx % SPEAKER_COLORS.length].id]),
      ),
  );

  // Lookup speaker by label for segments without speaker_id
  const speakerByLabel = useMemo(
    () => Object.fromEntries(transcript.speakers.map((sp) => [sp.speaker_label, sp])),
    [transcript.speakers],
  );

  const getSpeakerForSegment = (segment: TranscriptSegment) => {
    if (segment.speaker_id) {
      return transcript.speakers.find((sp) => sp.id === segment.speaker_id);
    }
    return speakerByLabel[segment.speaker_label];
  };

  const getColorForSegment = (segment: TranscriptSegment) => {
    const speaker = getSpeakerForSegment(segment);
    if (speaker) {
      const colorId = speakerColors[speaker.id];
      return SPEAKER_COLORS.find((c) => c.id === colorId) ?? SPEAKER_COLORS[0];
    }
    // Unknown speaker – fallback by label index
    const labelIdx = Object.keys(speakerByLabel).indexOf(segment.speaker_label);
    return SPEAKER_COLORS[Math.max(0, labelIdx) % SPEAKER_COLORS.length];
  };

  const getSpeakerDisplayName = (segment: TranscriptSegment): string => {
    const speaker = getSpeakerForSegment(segment);
    if (speaker) {
      return speakerDrafts[speaker.id] ?? speaker.display_name ?? speaker.speaker_label;
    }
    return segment.speaker_label;
  };

  // ─── Handlers ────────────────────────────────────────────────────────────────

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
        toast.success("Segment saved.");
        setEditingSegmentId(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save segment.");
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

  const snapshotVersion = (changeNote: string) => {
    startTransition(async () => {
      try {
        setIsCreatingVersion(true);
        await createMeetingVersionAction(meetingId, {
          from_version: transcript.version_no,
          change_note: changeNote || "Manual transcript edits",
        });
        toast.success("Version snapshot created.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create version.");
      } finally {
        setIsCreatingVersion(false);
      }
    });
  };

  // Show a time separator before a segment if there's a gap > threshold
  const needsTimeSeparator = (idx: number): boolean => {
    if (idx === 0) return true;
    const curr = transcript.segments[idx];
    const prev = transcript.segments[idx - 1];
    return curr.start_ms - prev.end_ms > TIME_SEPARATOR_GAP_MS;
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6 items-start">
      {/* ── Left: conversation view ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {transcript.segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
            <p className="font-medium text-muted-foreground">No transcript segments</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Process the meeting audio to generate a transcript.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transcript.segments.map((segment, idx) => {
              const color = getColorForSegment(segment);
              const speakerName = getSpeakerDisplayName(segment);

              return (
                <div key={segment.id}>
                  {/* Time separator */}
                  {needsTimeSeparator(idx) && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border/40" />
                      <span className="text-[11px] text-muted-foreground/40 shrink-0 tabular-nums">
                        {formatMs(segment.start_ms)}
                      </span>
                      <div className="flex-1 h-px bg-border/40" />
                    </div>
                  )}

                  <ChatBubble
                    segment={segment}
                    speakerName={speakerName}
                    color={color}
                    isEditing={editingSegmentId === segment.id}
                    draft={segmentDrafts[segment.id] ?? segment.text}
                    isSaving={savingSegmentId === segment.id}
                    onStartEdit={() => {
                      // Close any previously open editor without saving
                      if (editingSegmentId && editingSegmentId !== segment.id) {
                        const original = transcript.segments.find((s) => s.id === editingSegmentId);
                        if (original) {
                          setSegmentDrafts((prev) => ({ ...prev, [editingSegmentId]: original.text }));
                        }
                      }
                      setEditingSegmentId(segment.id);
                    }}
                    onDraftChange={(text) =>
                      setSegmentDrafts((prev) => ({ ...prev, [segment.id]: text }))
                    }
                    onSave={() => saveSegment(segment.id)}
                    onCancel={() => {
                      setSegmentDrafts((prev) => ({ ...prev, [segment.id]: segment.text }));
                      setEditingSegmentId(null);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right: control panel ──────────────────────────────────────────── */}
      <div className="w-72 shrink-0 space-y-4 sticky top-6">
        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
          <span>{transcript.segments.length} segments</span>
          <span className="text-border">·</span>
          <span>{transcript.speakers.length} speakers</span>
          <span className="text-border">·</span>
          <span>v{transcript.version_no}</span>
        </div>

        <SpeakerPanel
          speakers={transcript.speakers}
          speakerDrafts={speakerDrafts}
          speakerColors={speakerColors}
          renamingSpeakerId={renamingSpeakerId}
          onDraftChange={(id, name) => setSpeakerDrafts((prev) => ({ ...prev, [id]: name }))}
          onRename={renameSpeaker}
          onColorChange={(speakerId, colorId) =>
            setSpeakerColors((prev) => ({ ...prev, [speakerId]: colorId }))
          }
        />

        <VersionPanel
          versionNo={transcript.version_no}
          isCreating={isCreatingVersion}
          onSnapshot={snapshotVersion}
        />
      </div>
    </div>
  );
}
