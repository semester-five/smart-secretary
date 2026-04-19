"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Save, Trash2 } from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/server/api-actions";
import { confirmMediaUploadAction, createPresignedUrlAction, updateProjectAction } from "@/server/api-actions";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function UpdateProjectForm({ project }: { project: Project }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<"active" | "archived">(project.status);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(project.cover_image_url);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (removeCover) {
      setCoverPreviewUrl(null);
      return;
    }

    if (!coverFile) {
      setCoverPreviewUrl(project.cover_image_url);
      return;
    }

    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [coverFile, project.cover_image_url, removeCover]);

  const validateCoverFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      return "Cover image must be JPG, PNG, or WEBP.";
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return "Cover image must be 5MB or smaller.";
    }
    return null;
  };

  const uploadCoverImage = async (file: File): Promise<string> => {
    const presigned = await createPresignedUrlAction({
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
    });

    const uploadResponse = await fetch(presigned.signed_url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload cover image to storage.");
    }

    const media = await confirmMediaUploadAction({
      path: presigned.path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });

    return media.id;
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error("Project name is required.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: {
          name: string;
          description?: string;
          status: "active" | "archived";
          cover_image_media_id?: string | null;
        } = {
          name: name.trim(),
          description: description.trim() || undefined,
          status,
        };

        if (coverFile) {
          payload.cover_image_media_id = await uploadCoverImage(coverFile);
        } else if (removeCover) {
          payload.cover_image_media_id = null;
        }

        await updateProjectAction(project.id, {
          ...payload,
        });
        toast.success("Project updated.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update project.");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="project-name" className="font-medium text-sm">
          Name
        </label>
        <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <div className="space-y-1">
        <label htmlFor="project-description" className="font-medium text-sm">
          Description
        </label>
        <Textarea
          id="project-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-3">
        <span className="font-medium text-sm">Cover image</span>
        {coverPreviewUrl ? (
          <div className="group relative overflow-hidden rounded-md border shadow-sm">
            {/* biome-ignore lint/performance/noImgElement: Cover previews can use dynamic blob/runtime storage URLs. */}
            <img
              src={coverPreviewUrl}
              alt="Project cover preview"
              className="aspect-video w-full rounded-md object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="mr-2 size-4" /> Change Image
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setCoverFile(null);
                  setRemoveCover(true);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex aspect-video w-full flex-col items-center justify-center rounded-md border border-dashed bg-muted/20 transition-colors hover:bg-muted/40"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="mb-2 size-8 text-muted-foreground/60" />
            <span className="font-medium text-muted-foreground text-sm">Click to upload cover image</span>
            <span className="mt-1 text-muted-foreground text-xs">JPG, PNG or WEBP (Max 5MB)</span>
          </button>
        )}
        <Input
          id="project-cover"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          ref={fileInputRef}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            const validationError = validateCoverFile(file);
            if (validationError) {
              toast.error(validationError);
              event.currentTarget.value = "";
              return;
            }
            setCoverFile(file);
            setRemoveCover(false);
          }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_1fr] md:items-end">
        <div className="space-y-1">
          <label htmlFor="project-status" className="font-medium text-sm">
            Status
          </label>
          <Select value={status} onValueChange={(value) => setStatus(value as "active" | "archived")}>
            <SelectTrigger id="project-status">
              <SelectValue placeholder="Choose status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="archived">archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="button" disabled={isPending} onClick={submit} className="w-full sm:w-auto">
            {isPending ? (
              "Saving..."
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Save changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
