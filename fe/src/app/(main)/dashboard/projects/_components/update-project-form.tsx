"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/server/api-actions";
import { updateProjectAction } from "@/server/api-actions";

export function UpdateProjectForm({ project }: { project: Project }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<"active" | "archived">(project.status);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    if (!name.trim()) {
      toast.error("Project name is required.");
      return;
    }

    startTransition(async () => {
      try {
        await updateProjectAction(project.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          status,
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

      <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_1fr] md:items-end">
        <div className="space-y-1">
          <span className="font-medium text-sm">Status</span>
          <Select value={status} onValueChange={(value) => setStatus(value as "active" | "archived") }>
            <SelectTrigger>
              <SelectValue placeholder="Choose status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="archived">archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Button type="button" disabled={isPending} onClick={submit}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
