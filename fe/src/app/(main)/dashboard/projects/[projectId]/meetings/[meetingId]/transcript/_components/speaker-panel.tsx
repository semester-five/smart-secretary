"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Speaker } from "@/server/api-actions";

import { SPEAKER_COLORS } from "./chat-bubble";

interface SpeakerPanelProps {
  speakers: Speaker[];
  speakerDrafts: Record<string, string>;
  speakerColors: Record<string, string>; // speakerId → colorId
  renamingSpeakerId: string | null;
  onDraftChange: (speakerId: string, name: string) => void;
  onRename: (speakerId: string) => void;
  onColorChange: (speakerId: string, colorId: string) => void;
}

export function SpeakerPanel({
  speakers,
  speakerDrafts,
  speakerColors,
  renamingSpeakerId,
  onDraftChange,
  onRename,
  onColorChange,
}: SpeakerPanelProps) {
  if (speakers.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Speakers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No speakers detected yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Speakers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {speakers.map((speaker, idx) => {
          const currentColorId = speakerColors[speaker.id] ?? SPEAKER_COLORS[idx % SPEAKER_COLORS.length].id;
          const currentColor = SPEAKER_COLORS.find((c) => c.id === currentColorId) ?? SPEAKER_COLORS[0];

          return (
            <div key={speaker.id} className="space-y-2">
              {/* Label */}
              <p className="text-xs text-muted-foreground">{speaker.speaker_label}</p>

              {/* Color swatches */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {SPEAKER_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.id}
                    className={`size-4 rounded-full transition-all ${c.dotClass} ${
                      currentColorId === c.id
                        ? "ring-2 ring-offset-1 ring-offset-background ring-white/60 scale-125"
                        : "opacity-50 hover:opacity-90 hover:scale-110"
                    }`}
                    onClick={() => onColorChange(speaker.id, c.id)}
                  />
                ))}
              </div>

              {/* Name input + rename */}
              <div className="flex items-center gap-1.5">
                <div className={`w-0.5 self-stretch rounded-full ${currentColor.accentBarClass}`} />
                <Input
                  value={speakerDrafts[speaker.id] ?? ""}
                  onChange={(e) => onDraftChange(speaker.id, e.target.value)}
                  placeholder={speaker.speaker_label}
                  className="h-8 text-sm flex-1 min-w-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onRename(speaker.id);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs shrink-0"
                  disabled={renamingSpeakerId === speaker.id}
                  onClick={() => onRename(speaker.id)}
                >
                  {renamingSpeakerId === speaker.id ? <Loader2 className="size-3 animate-spin" /> : "Rename"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
