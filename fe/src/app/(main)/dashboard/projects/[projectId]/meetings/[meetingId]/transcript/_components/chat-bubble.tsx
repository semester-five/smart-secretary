"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TranscriptSegment } from "@/server/api-actions";

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
  isSaving: boolean;
  onStartEdit: () => void;
  onDraftChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ChatBubble({
  segment,
  speakerName,
  color,
  isEditing,
  draft,
  isSaving,
  onStartEdit,
  onDraftChange,
  onSave,
  onCancel,
}: ChatBubbleProps) {
  return (
    <div className="group flex gap-3 animate-in fade-in duration-150">
      {/* Color dot */}
      <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
        <div className={`size-2.5 rounded-full ${color.dotClass}`} />
        {isEditing && <div className={`w-px flex-1 ${color.accentBarClass} opacity-30`} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        {/* Speaker name + timestamp */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-xs font-semibold tracking-tight ${color.textClass}`}>{speakerName}</span>
          <span className="text-xs text-muted-foreground/50">
            {formatMs(segment.start_ms)} – {formatMs(segment.end_ms)}
          </span>
          {segment.source === "ai" && (
            <span className="text-[10px] text-muted-foreground/40 ml-auto">AI</span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl rounded-tl-none border border-border/50 px-4 py-2.5 ${color.bgClass} transition-colors duration-150 ${!isEditing ? "hover:brightness-110 cursor-text" : ""}`}
        >
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                rows={Math.max(2, (draft.match(/\n/g)?.length ?? 0) + 1)}
                className="text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 shadow-none min-h-0 leading-relaxed"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") onCancel();
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSave();
                }}
              />
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                <Button size="sm" className="h-6 px-2.5 text-xs" onClick={onSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="size-3 animate-spin" /> : "Save"}
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
                <span className="ml-auto text-[10px] text-muted-foreground/40">Ctrl+Enter</span>
              </div>
            </div>
          ) : (
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              onClick={onStartEdit}
            >
              {segment.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
