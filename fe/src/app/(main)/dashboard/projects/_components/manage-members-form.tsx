"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CurrentUser } from "@/server/api-actions";
import { addProjectMemberAction, removeProjectMemberAction } from "@/server/api-actions";

export function ManageMembersForm({ projectId, users }: { projectId: string; users: CurrentUser[] }) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [manualAddUserId, setManualAddUserId] = useState("");
  const [memberRole, setMemberRole] = useState<"owner" | "editor" | "viewer">("viewer");
  const [removeUserId, setRemoveUserId] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sortedUsers = useMemo(() => [...users].sort((a, b) => a.username.localeCompare(b.username)), [users]);

  const addMember = () => {
    const userId = selectedUserId || manualAddUserId.trim();
    if (!userId) {
      toast.error("Please choose a user or enter user ID.");
      return;
    }

    startTransition(async () => {
      try {
        await addProjectMemberAction(projectId, {
          user_id: userId,
          member_role: memberRole,
        });
        toast.success("Member added.");
        setSelectedUserId("");
        setManualAddUserId("");
        setMemberRole("viewer");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add member.");
      }
    });
  };

  const removeMember = () => {
    if (!removeUserId.trim()) {
      toast.error("Enter a user ID to remove.");
      return;
    }

    startTransition(async () => {
      try {
        await removeProjectMemberAction(projectId, removeUserId.trim());
        toast.success("Member removed.");
        setRemoveUserId("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to remove member.");
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <UserPlus className="size-5 text-primary" />
          Add member
        </h3>
        <div className="space-y-2">
          <span className="font-medium text-sm">User</span>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {sortedUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.username} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">If user list is empty, enter user ID manually below.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="manual-add-user-id" className="font-medium text-sm">
            User ID (manual)
          </label>
          <Input
            id="manual-add-user-id"
            value={manualAddUserId}
            onChange={(event) => setManualAddUserId(event.target.value)}
            placeholder="f9c0..."
          />
        </div>

        <div className="space-y-2 flex-1">
          <label htmlFor="member-role" className="font-medium text-sm">
            Role
          </label>
          <Select value={memberRole} onValueChange={(value) => setMemberRole(value as "owner" | "editor" | "viewer")}>
            <SelectTrigger id="member-role">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">owner</SelectItem>
              <SelectItem value="editor">editor</SelectItem>
              <SelectItem value="viewer">viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="button" disabled={isPending} onClick={addMember} className="w-full">
          {isPending ? "Adding..." : "Add member"}
        </Button>
      </div>

      <div className="flex flex-col space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-destructive">
          <Trash2 className="size-5" />
          Remove member
        </h3>
        <p className="text-muted-foreground text-sm">
          Current backend provides remove-by-user-id API only. Paste the member user ID below.
        </p>
        <div className="space-y-2 flex-1">
          <label htmlFor="remove-user-id" className="font-medium text-sm">
            User ID
          </label>
          <Input
            id="remove-user-id"
            value={removeUserId}
            onChange={(event) => setRemoveUserId(event.target.value)}
            placeholder="f9c0..."
          />
        </div>
        <Button type="button" variant="destructive" disabled={isPending} onClick={removeMember} className="w-full">
          {isPending ? "Removing..." : "Remove member"}
        </Button>
      </div>
    </div>
  );
}
