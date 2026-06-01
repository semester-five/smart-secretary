"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "@/lib/icons";
import type { Speaker, TranscriptSegment } from "@/server/api-actions";

// ─── Speaker color palette ───────────────────────────────────────────────────

export type SpeakerColorConfig = {
  id: string;
  dotClass: string;
  accentBarClass: string;
  bgClass: string;
  textClass: string;
};

export const SPEAKER_COLORS: SpeakerColorConfig[] = [
  {
    id: "blue",
    dotClass: "bg-blue-400",
    accentBarClass: "bg-blue-400",
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-400",
  },
  {
    id: "violet",
    dotClass: "bg-violet-400",
    accentBarClass: "bg-violet-400",
    bgClass: "bg-violet-500/10",
    textClass: "text-violet-400",
  },
  {
    id: "emerald",
    dotClass: "bg-emerald-400",
    accentBarClass: "bg-emerald-400",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-400",
  },
  {
    id: "rose",
    dotClass: "bg-rose-400",
    accentBarClass: "bg-rose-400",
    bgClass: "bg-rose-500/10",
    textClass: "text-rose-400",
  },
  {
    id: "amber",
    dotClass: "bg-amber-400",
    accentBarClass: "bg-amber-400",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400",
  },
  {
    id: "cyan",
    dotClass: "bg-cyan-400",
    accentBarClass: "bg-cyan-400",
    bgClass: "bg-cyan-500/10",
    textClass: "text-cyan-400",
  },
];

// ─── Time format helper ───────────────────────────────────────────────────────

export function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ─── ChatBubble component ─────────────────────────────────────────────────────

interface ChatBubbleProps {
  segment: TranscriptSegment;
  speakerName: string;
  color: SpeakerColorConfig;
  isEditing: boolean;
  draft: string;
  draftSpeakerId: string;
  allSpeakers: Speaker[];
  isSaving: boolean;
  onStartEdit: () => void;
  onDraftChange: (text: string) => void;
  onDraftSpeakerChange: (speakerId: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ChatBubble({
  segment,
  speakerName,
  color,
  isEditing,
  draft,
  draftSpeakerId,
  allSpeakers,
  isSaving,
  onStartEdit,
  onDraftChange,
  onDraftSpeakerChange,
  onSave,
  onCancel,
}: ChatBubbleProps) {
  return (
    <div className="group fade-in flex animate-in gap-3 duration-150">
      {/* Color dot */}
      <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
        <div className={`size-2.5 rounded-full ${color.dotClass}`} />
        {isEditing && (
          <div className={`w-px flex-1 ${color.accentBarClass} opacity-30`} />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-1">
        {/* Speaker name + timestamp */}
        <div className="mb-1 flex items-baseline gap-2">
          <span
            className={`font-semibold text-xs tracking-tight ${color.textClass}`}
          >
            {speakerName}
          </span>
          <span className="text-muted-foreground/50 text-xs">
            {formatMs(segment.start_ms)} – {formatMs(segment.end_ms)}
          </span>
          {segment.source === "ai" && (
            <span className="ml-auto text-[10px] text-muted-foreground/40">
              AI
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl rounded-tl-none border border-border/50 px-4 py-2.5 ${color.bgClass} transition-colors duration-150 ${!isEditing ? "cursor-text hover:brightness-110" : ""}`}
        >
          {isEditing ? (
            <div className="space-y-3">
              <div className="w-[200px]">
                <Select
                  value={draftSpeakerId}
                  onValueChange={onDraftSpeakerChange}
                >
                  <SelectTrigger className="h-7 border-border/50 bg-transparent text-xs">
                    <SelectValue placeholder="Select speaker" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSpeakers.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id} className="text-xs">
                        {sp.display_name || sp.speaker_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                rows={Math.max(2, (draft.match(/\n/g)?.length ?? 0) + 1)}
                className="min-h-0 resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") onCancel();
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSave();
                }}
              />
              <div className="flex items-center gap-1.5 border-border/40 border-t pt-1.5">
                <Button
                  size="sm"
                  className="h-6 px-2.5 text-xs"
                  onClick={onSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={onCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <span className="ml-auto text-[10px] text-muted-foreground/40">
                  Ctrl+Enter
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="w-full whitespace-pre-wrap bg-transparent p-0 text-left text-sm leading-relaxed"
              onClick={onStartEdit}
            >
              {segment.text}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
