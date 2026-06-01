"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "@/lib/icons";
import {
  getTranscriptAction,
  type MeetingVersion,
  type Transcript,
} from "@/server/api-actions";

import { formatMs } from "./chat-bubble";

interface CompareModalProps {
  meetingId: string;
  isOpen: boolean;
  onClose: () => void;
  versions: MeetingVersion[];
}

export function CompareModal({
  meetingId,
  isOpen,
  onClose,
  versions,
}: CompareModalProps) {
  const [versionA, setVersionA] = useState<string>("");
  const [versionB, setVersionB] = useState<string>("");

  useEffect(() => {
    if (isOpen && versions.length >= 2) {
      setVersionB(versions[0].version_no.toString()); // Latest
      setVersionA(versions[1].version_no.toString()); // Previous
    }
  }, [isOpen, versions]);

  const { data: transcriptA, isLoading: loadingA } = useQuery({
    queryKey: ["transcript", meetingId, versionA],
    queryFn: () => getTranscriptAction(meetingId, versionA),
    enabled: !!versionA && isOpen,
  });

  const { data: transcriptB, isLoading: loadingB } = useQuery({
    queryKey: ["transcript", meetingId, versionB],
    queryFn: () => getTranscriptAction(meetingId, versionB),
    enabled: !!versionB && isOpen,
  });

  const renderTranscript = (
    transcript: Transcript | undefined,
    isLoading: boolean,
  ) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (!transcript) {
      return (
        <div className="p-4 text-center text-muted-foreground text-sm">
          Select a version
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        {transcript.segments.map((seg) => {
          const speaker = transcript.speakers.find(
            (s) => s.id === seg.speaker_id,
          );
          const speakerName = speaker
            ? speaker.display_name || speaker.speaker_label
            : "Unknown Speaker";
          return (
            <div key={seg.id} className="text-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-semibold text-primary text-xs">
                  {speakerName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatMs(seg.start_ms)} - {formatMs(seg.end_ms)}
                </span>
              </div>
              <p className="rounded-md bg-muted/30 p-2 leading-relaxed">
                {seg.text}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[80vh] w-[95vw] max-w-[1400px] flex-col overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Compare Versions</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 gap-6 overflow-hidden bg-background">
          {/* Column A */}
          <div className="flex min-w-0 flex-1 flex-col border-r">
            <div className="flex items-center gap-3 border-b bg-muted/10 p-3">
              <span className="font-medium text-sm">Version:</span>
              <Select value={versionA} onValueChange={setVersionA}>
                <SelectTrigger className="h-8 w-40">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.version_no.toString()}>
                      Version {v.version_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderTranscript(transcriptA, loadingA)}
            </div>
          </div>

          {/* Column B */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b bg-muted/10 p-3">
              <span className="font-medium text-sm">Compare with:</span>
              <Select value={versionB} onValueChange={setVersionB}>
                <SelectTrigger className="h-8 w-40">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.version_no.toString()}>
                      Version {v.version_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderTranscript(transcriptB, loadingB)}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
