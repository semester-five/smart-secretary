"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Loader2, WandSparkles } from "@/lib/icons";
import {
  createMeetingVersionAction,
  generateSummaryAction,
  getMeetingStatusAction,
  type MeetingSummary,
  type SummaryLanguage,
  updateMeetingSummaryAction,
} from "@/server/api-actions";

const summaryLanguageOptions: Array<{
  value: SummaryLanguage;
  label: string;
}> = [
  { value: "auto", label: "Auto" },
  { value: "vi", label: "Vietnamese" },
  { value: "en", label: "English" },
];

function getInitialSummaryLanguage(summary: MeetingSummary | null): SummaryLanguage {
  const requestedLanguage = summary?.key_points_json?.requested_language;
  return requestedLanguage === "vi" || requestedLanguage === "en" ? requestedLanguage : "auto";
}

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
  const [summaryLanguage, setSummaryLanguage] = useState<SummaryLanguage>(getInitialSummaryLanguage(initialSummary));
  const [changeNote, setChangeNote] = useState("");

  const generateSummary = () => {
    startTransition(async () => {
      try {
        setActiveAction("generate");
        await generateSummaryAction(meetingId, { language: summaryLanguage });
        toast.success("Summary generation has been queued.");
        const poll = window.setInterval(async () => {
          try {
            const status = await getMeetingStatusAction(meetingId);
            const latestJob = status.latest_job;
            if (latestJob?.job_type !== "summary") return;
            if (latestJob.status === "completed") {
              window.clearInterval(poll);
              router.refresh();
            }
            if (latestJob.status === "failed") {
              window.clearInterval(poll);
              toast.error(latestJob.error_message ?? "Summary generation failed.");
            }
          } catch {
            window.clearInterval(poll);
          }
        }, 2500);
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
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={summaryLanguage}
              onValueChange={(value) => setSummaryLanguage(value as SummaryLanguage)}
              disabled={isPending && activeAction === "generate"}
            >
              <SelectTrigger className="w-[180px]">
                <Globe className="size-4 text-muted-foreground" />
                <SelectValue aria-label="Summary language" />
              </SelectTrigger>
              <SelectContent>
                {summaryLanguageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
