"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAction } from "@/server/api-actions";

export function CreateProjectForm() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    if (!code.trim() || !name.trim()) {
      toast.error("Code and name are required.");
      return;
    }

    startTransition(async () => {
      try {
        await createProjectAction({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          status,
        });
        toast.success("Project created.");
        setCode("");
        setName("");
        setDescription("");
        setStatus("active");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create project.");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="project-code" className="font-medium text-sm">
            Code
          </label>
          <Input
            id="project-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="PRJ-001"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="project-name" className="font-medium text-sm">
            Name
          </label>
          <Input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Board Meeting Q2"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="project-description" className="font-medium text-sm">
          Description
        </label>
        <Textarea
          id="project-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional summary"
          rows={3}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_1fr] md:items-end">
        <div className="space-y-1">
          <span className="font-medium text-sm">Status</span>
          <Select value={status} onValueChange={(value) => setStatus(value as "active" | "archived")}>
            <SelectTrigger>
              <SelectValue placeholder="Choose status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="archived">archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button type="button" disabled={isPending} onClick={submit} className="w-full sm:w-auto">
            {isPending ? (
              "Creating..."
            ) : (
              <>
                <Plus className="mr-2 size-4" />
                Create project
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
