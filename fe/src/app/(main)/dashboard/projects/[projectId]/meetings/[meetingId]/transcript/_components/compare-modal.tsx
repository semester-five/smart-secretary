"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "@/lib/icons";
import { getTranscriptAction, type MeetingVersion, type Transcript } from "@/server/api-actions";

import { formatMs } from "./chat-bubble";

interface CompareModalProps {
  meetingId: string;
  isOpen: boolean;
  onClose: () => void;
  versions: MeetingVersion[];
}

export function CompareModal({ meetingId, isOpen, onClose, versions }: CompareModalProps) {
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

  const renderTranscript = (transcript: Transcript | undefined, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (!transcript) {
      return <div className="p-4 text-center text-sm text-muted-foreground">Select a version</div>;
    }

    return (
      <div className="space-y-4 p-4">
        {transcript.segments.map((seg) => {
          const speaker = transcript.speakers.find((s) => s.id === seg.speaker_id);
          const speakerName = speaker ? speaker.display_name || speaker.speaker_label : "Unknown Speaker";
          return (
            <div key={seg.id} className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-primary text-xs">{speakerName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {formatMs(seg.start_ms)} - {formatMs(seg.end_ms)}
                </span>
              </div>
              <p className="leading-relaxed bg-muted/30 p-2 rounded-md">{seg.text}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Compare Versions</DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex overflow-hidden bg-background">
          {/* Column A */}
          <div className="flex-1 flex flex-col border-r">
            <div className="p-3 border-b bg-muted/10 flex items-center gap-3">
              <span className="text-sm font-medium">Version:</span>
              <Select value={versionA} onValueChange={setVersionA}>
                <SelectTrigger className="w-32 h-8">
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
            <div className="flex-1 overflow-y-auto">{renderTranscript(transcriptA, loadingA)}</div>
          </div>

          {/* Column B */}
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b bg-muted/10 flex items-center gap-3">
              <span className="text-sm font-medium">Compare with:</span>
              <Select value={versionB} onValueChange={setVersionB}>
                <SelectTrigger className="w-32 h-8">
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
            <div className="flex-1 overflow-y-auto">{renderTranscript(transcriptB, loadingB)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
