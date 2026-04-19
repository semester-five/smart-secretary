"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/utils";
import {
  type CurrentUser,
  confirmMediaUploadAction,
  createPresignedUrlAction,
  updateCurrentUserAction,
} from "@/server/api-actions";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function UpdateProfileForm({ currentUser }: { currentUser: CurrentUser }) {
  const [fullName, setFullName] = useState(currentUser.full_name ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(currentUser.avatar_url);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (removeAvatar) {
      setAvatarPreviewUrl(null);
      return;
    }

    if (!avatarFile) {
      setAvatarPreviewUrl(currentUser.avatar_url);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile, currentUser.avatar_url, removeAvatar]);

  const validateAvatarFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      return "Avatar must be JPG, PNG, or WEBP.";
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return "Avatar must be 5MB or smaller.";
    }
    return null;
  };

  const uploadAvatar = async (file: File): Promise<string> => {
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
      throw new Error("Failed to upload avatar to storage.");
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
    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: { full_name: string; avatar_media_id?: string | null } = {
          full_name: fullName.trim(),
        };

        if (avatarFile) {
          payload.avatar_media_id = await uploadAvatar(avatarFile);
        } else if (removeAvatar) {
          payload.avatar_media_id = null;
        }

        await updateCurrentUserAction(payload);
        toast.success("Profile updated.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update profile.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar className="size-20 border shadow-sm">
          <AvatarImage src={avatarPreviewUrl ?? undefined} alt={currentUser.username} className="object-cover" />
          <AvatarFallback className="text-lg">{getInitials(currentUser.username)}</AvatarFallback>
        </Avatar>
        <div className="flex w-full items-center gap-2">
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            ref={fileInputRef}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              const validationError = validateAvatarFile(file);
              if (validationError) {
                toast.error(validationError);
                event.currentTarget.value = "";
                return;
              }

              setAvatarFile(file);
              setRemoveAvatar(false);
            }}
          />
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 size-4" />
            Upload new
          </Button>
          {(avatarPreviewUrl || avatarFile) && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setAvatarFile(null);
                setRemoveAvatar(true);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="full-name" className="font-medium text-sm">
          Full name
        </label>
        <Input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
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
  );
}
