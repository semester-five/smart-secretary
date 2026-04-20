"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Loader2, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createMeetingVersionAction,
  generateSummaryAction,
  type MeetingSummary,
  updateMeetingSummaryAction,
} from "@/server/api-actions";

export function SummaryClient({
  meetingId,
  initialSummary,
}: {
  meetingId: string;
  initialSummary: MeetingSummary | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<"generate" | "save" | "snapshot" | null>(null);
  const [summaryText, setSummaryText] = useState(initialSummary?.summary_text ?? "");
  const [changeNote, setChangeNote] = useState("");

  const generateSummary = () => {
    startTransition(async () => {
      try {
        setActiveAction("generate");
        await generateSummaryAction(meetingId);
        toast.success("Summary generation has been queued.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to queue summary generation.");
      } finally {
        setActiveAction(null);
      }
    });
  };

  const saveSummary = () => {
    const nextText = summaryText.trim();
    if (!nextText) {
      toast.error("Summary text cannot be empty.");
      return;
    }

    startTransition(async () => {
      try {
        setActiveAction("save");
        await updateMeetingSummaryAction(meetingId, {
          summary_text: nextText,
          key_points_json: initialSummary?.key_points_json ?? null,
          decisions_json: initialSummary?.decisions_json ?? null,
        });
        toast.success("Summary updated.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update summary.");
      } finally {
        setActiveAction(null);
      }
    });
  };

  const createSnapshot = () => {
    startTransition(async () => {
      try {
        setActiveAction("snapshot");
        await createMeetingVersionAction(meetingId, {
          change_note: changeNote || "Manual summary edits",
        });
        toast.success("New version snapshot created.");
        setChangeNote("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create version.");
      } finally {
        setActiveAction(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Summary editor</CardTitle>
          <CardDescription>Generate with AI or manually refine the summary content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={summaryText} onChange={(event) => setSummaryText(event.target.value)} rows={10} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending && activeAction === "generate"}
              onClick={generateSummary}
            >
              {isPending && activeAction === "generate" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <WandSparkles className="size-4" />
              )}
              Generate summary
            </Button>
            <Button type="button" disabled={isPending && activeAction === "save"} onClick={saveSummary}>
              {isPending && activeAction === "save" ? <Loader2 className="size-4 animate-spin" /> : null}
              Save summary
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version snapshot</CardTitle>
          <CardDescription>Create a snapshot after manual summary updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={changeNote}
            onChange={(event) => setChangeNote(event.target.value)}
            placeholder="Change note (optional)"
          />
          <Button type="button" disabled={isPending && activeAction === "snapshot"} onClick={createSnapshot}>
            {isPending && activeAction === "snapshot" ? <Loader2 className="size-4 animate-spin" /> : null}
            Create version
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
