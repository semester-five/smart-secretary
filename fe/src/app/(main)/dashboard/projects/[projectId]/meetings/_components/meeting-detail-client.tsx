"use client";

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  clientGetMeetingStatus,
  clientProcessMeeting,
  clientUploadMeetingFile,
} from "@/data/api-client";
import { AudioLines, FileAudio, Loader2, RefreshCw, Upload } from "@/lib/icons";
import type {
  MeetingDetail,
  MeetingFile,
  MeetingStatus,
} from "@/server/api-actions";

const MAX_AUDIO_SIZE = 200 * 1024 * 1024;

export function MeetingDetailClient({
  meeting,
  initialStatus,
}: {
  readonly meeting: MeetingDetail;
  readonly initialStatus: MeetingStatus;
}) {
  const [files, setFiles] = useState<MeetingFile[]>(meeting.files);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Polling via React Query — uses client-side fetch through /api/client proxy.
  // Polls every 5 seconds to check processing status without full page reload.
  const { data: status } = useQuery({
    queryKey: ["meeting-status", meeting.id],
    queryFn: () => clientGetMeetingStatus(meeting.id),
    refetchInterval: (q) =>
      q.state.data?.meeting_status === "processing" ? 3000 : 10000,
    initialData: initialStatus,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await clientUploadMeetingFile(meeting.id, file);
      return uploaded as MeetingFile;
    },
    onSuccess: (uploaded) => {
      setFiles((current) => [...current, uploaded]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("Meeting file uploaded.");
      queryClient.invalidateQueries({
        queryKey: ["meeting-status", meeting.id],
      });
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload meeting file.",
      );
    },
  });

  const processMutation = useMutation({
    mutationFn: () => clientProcessMeeting(meeting.id),
    onSuccess: (nextStatus) => {
      queryClient.setQueryData(["meeting-status", meeting.id], nextStatus);
      toast.success("Processing queued.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to queue processing.",
      );
    },
  });

  const uploadFile = () => {
    if (!selectedFile) {
      toast.error("Select an audio file first.");
      return;
    }
    if (!selectedFile.type.startsWith("audio/")) {
      toast.error("Meeting file must be audio.");
      return;
    }
    if (selectedFile.size > MAX_AUDIO_SIZE) {
      toast.error("Audio file is too large.");
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  const processMeeting = () => {
    processMutation.mutate();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AudioLines className="size-5" />
              Upload meeting audio
            </CardTitle>
            <CardDescription>
              Multipart upload with server-side size validation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:flex-1">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                  }}
                  className="hidden"
                  id="audio-upload"
                />
                <label
                  htmlFor="audio-upload"
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-muted-foreground/30 border-dashed bg-muted/20 px-6 py-4 text-foreground text-sm transition-all hover:border-muted-foreground/50 hover:bg-muted/40"
                >
                  <Upload className="size-4 text-muted-foreground" />
                  {selectedFile ? (
                    <span className="line-clamp-1 flex-1 break-all text-center font-medium text-primary">
                      {selectedFile.name}
                    </span>
                  ) : (
                    <span className="font-medium text-muted-foreground">
                      Click to select an audio file
                    </span>
                  )}
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={!selectedFile || uploadMutation.isPending}
                onClick={uploadFile}
                className="transition-all"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 size-4" />
                    Upload audio
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={
                  processMutation.isPending ||
                  status.meeting_status === "processing"
                }
                onClick={processMeeting}
                className="transition-all hover:bg-muted/50"
              >
                {processMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Queuing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 size-4" />
                    Process meeting
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Uploaded files</CardTitle>
            <CardDescription>Files attached to this meeting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.length > 0 ? (
              files.map((file) => (
                <div
                  key={file.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:bg-muted/20 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <FileAudio className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="truncate font-medium"
                        title={file.file_name}
                      >
                        {file.file_name}
                      </p>
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        {(file.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                        &middot; {file.mime_type}
                      </p>
                    </div>
                  </div>
                  {file.file_url ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full shrink-0 sm:w-auto"
                    >
                      <a href={file.file_url} target="_blank" rel="noreferrer">
                        Download
                      </a>
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 py-8 text-center">
                <FileAudio className="mb-2 size-6 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground text-sm">
                  No files uploaded yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>Processing status</span>
              <Badge
                variant={
                  status.meeting_status === "completed"
                    ? "default"
                    : status.meeting_status === "failed"
                      ? "destructive"
                      : status.meeting_status === "processing"
                        ? "default"
                        : "secondary"
                }
                className={
                  status.meeting_status === "processing" ? "animate-pulse" : ""
                }
              >
                {status.meeting_status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Automatically synced from the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Job progress</span>
                <span className="text-muted-foreground capitalize">
                  {status.latest_job?.status ?? "idle"}
                </span>
              </div>
              <Progress
                value={status.latest_job?.progress ?? 0}
                className="h-2"
              />
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/10 p-3 shadow-sm">
                <span className="text-muted-foreground">Files</span>
                <span className="font-medium">{status.file_count}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/10 p-3 shadow-sm">
                <span className="text-muted-foreground">Latest job</span>
                <span className="font-medium capitalize">
                  {status.latest_job?.job_type ?? "none"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/10 p-3 shadow-sm">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium">
                  {new Date(status.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 transition-all hover:bg-muted/50 sm:w-auto"
              onClick={processMeeting}
              disabled={
                processMutation.isPending ||
                status.meeting_status === "processing"
              }
            >
              {processMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Queue processing again
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
