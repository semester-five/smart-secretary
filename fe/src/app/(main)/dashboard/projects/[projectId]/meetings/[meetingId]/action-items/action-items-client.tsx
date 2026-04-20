"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type ActionItem,
  createActionItemAction,
  deleteActionItemAction,
  updateActionItemAction,
} from "@/server/api-actions";

export function ActionItemsClient({ meetingId, initialItems }: { meetingId: string; initialItems: ActionItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<ActionItem["priority"]>("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const initialDrafts = useMemo(
    () =>
      Object.fromEntries(
        initialItems.map((item) => [
          item.id,
          {
            title: item.title,
            description: item.description ?? "",
            priority: item.priority,
            due_date: item.due_date ? item.due_date.slice(0, 10) : "",
            status: item.status,
          },
        ]),
      ),
    [initialItems],
  );
  const [drafts, setDrafts] =
    useState<
      Record<
        string,
        {
          title: string;
          description: string;
          priority: ActionItem["priority"];
          due_date: string;
          status: ActionItem["status"];
        }
      >
    >(initialDrafts);

  const createItem = () => {
    const title = newTitle.trim();
    if (!title) {
      toast.error("Action item title is required.");
      return;
    }

    startTransition(async () => {
      try {
        setIsCreating(true);
        await createActionItemAction(meetingId, {
          title,
          description: newDescription.trim() || null,
          priority: newPriority,
          due_date: newDueDate || null,
          status: "open",
        });
        toast.success("Action item created.");
        setNewTitle("");
        setNewDescription("");
        setNewPriority("medium");
        setNewDueDate("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create action item.");
      } finally {
        setIsCreating(false);
      }
    });
  };

  const toggleStatus = (item: ActionItem) => {
    const nextStatus = item.status === "done" ? "open" : "done";
    startTransition(async () => {
      try {
        setUpdatingItemId(item.id);
        await updateActionItemAction(meetingId, item.id, { status: nextStatus });
        toast.success("Action item updated.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update action item.");
      } finally {
        setUpdatingItemId(null);
      }
    });
  };

  const saveDetails = (item: ActionItem) => {
    const draft = drafts[item.id];
    if (!draft || !draft.title.trim()) {
      toast.error("Action item title is required.");
      return;
    }

    startTransition(async () => {
      try {
        setUpdatingItemId(item.id);
        await updateActionItemAction(meetingId, item.id, {
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          priority: draft.priority,
          due_date: draft.due_date || null,
          status: draft.status,
        });
        toast.success("Action item details updated.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update action item details.");
      } finally {
        setUpdatingItemId(null);
      }
    });
  };

  const removeItem = (itemId: string) => {
    startTransition(async () => {
      try {
        setDeletingItemId(itemId);
        await deleteActionItemAction(meetingId, itemId);
        toast.success("Action item deleted.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete action item.");
      } finally {
        setDeletingItemId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create action item</CardTitle>
          <CardDescription>Add follow-up tasks from this meeting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Title" />
          <Textarea
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="Description (optional)"
            rows={3}
          />
          <div className="grid gap-2 md:grid-cols-2">
            <select
              value={newPriority}
              onChange={(event) => setNewPriority(event.target.value as ActionItem["priority"])}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            <Input type="date" value={newDueDate} onChange={(event) => setNewDueDate(event.target.value)} />
          </div>
          <Button type="button" disabled={isPending && isCreating} onClick={createItem}>
            {isPending && isCreating ? <Loader2 className="size-4 animate-spin" /> : null}
            Add action item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task list</CardTitle>
          <CardDescription>Toggle done/open status and remove outdated tasks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {initialItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">No action items yet.</p>
          ) : (
            initialItems.map((item) => (
              <div key={item.id} className="space-y-3 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-sm">{item.title}</p>
                  <Badge variant={item.status === "done" ? "default" : "secondary"}>{item.status}</Badge>
                </div>

                <Input
                  value={drafts[item.id]?.title ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [item.id]: { ...current[item.id], title: event.target.value },
                    }))
                  }
                  placeholder="Title"
                />
                <Textarea
                  value={drafts[item.id]?.description ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [item.id]: { ...current[item.id], description: event.target.value },
                    }))
                  }
                  placeholder="Description"
                  rows={2}
                />
                <div className="grid gap-2 md:grid-cols-3">
                  <select
                    value={drafts[item.id]?.priority ?? "medium"}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [item.id]: {
                          ...current[item.id],
                          priority: event.target.value as ActionItem["priority"],
                        },
                      }))
                    }
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                  <Input
                    type="date"
                    value={drafts[item.id]?.due_date ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [item.id]: { ...current[item.id], due_date: event.target.value },
                      }))
                    }
                  />
                  <select
                    value={drafts[item.id]?.status ?? "open"}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [item.id]: {
                          ...current[item.id],
                          status: event.target.value as ActionItem["status"],
                        },
                      }))
                    }
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="open">open</option>
                    <option value="in_progress">in_progress</option>
                    <option value="done">done</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={isPending && updatingItemId === item.id}
                    onClick={() => saveDetails(item)}
                  >
                    {isPending && updatingItemId === item.id ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save details
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending && updatingItemId === item.id}
                    onClick={() => toggleStatus(item)}
                  >
                    {isPending && updatingItemId === item.id ? <Loader2 className="size-4 animate-spin" /> : null}
                    Mark as {item.status === "done" ? "open" : "done"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isPending && deletingItemId === item.id}
                    onClick={() => removeItem(item.id)}
                  >
                    {isPending && deletingItemId === item.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
