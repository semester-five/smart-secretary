"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Speaker,
  listSpeakersAction,
  createSpeakerAction,
  updateSpeakerAction,
  deleteSpeakerAction,
} from "@/server/api-actions";

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "violet", label: "Violet", class: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  { value: "emerald", label: "Emerald", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "rose", label: "Rose", class: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  { value: "amber", label: "Amber", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
];

export function SpeakersClient({
  meetingId,
  initialSpeakers,
}: {
  meetingId: string;
  initialSpeakers: Speaker[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [formData, setFormData] = useState({ display_name: "", color_label: "blue" });

  const { data: speakers = initialSpeakers, isLoading } = useQuery({
    queryKey: ["speakers", meetingId],
    queryFn: () => listSpeakersAction(meetingId),
    initialData: initialSpeakers,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { display_name: string; color_label: string }) =>
      createSpeakerAction(meetingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speakers", meetingId] });
      toast.success("Speaker created successfully");
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to create speaker");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { display_name: string; color_label: string } }) =>
      updateSpeakerAction(meetingId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speakers", meetingId] });
      toast.success("Speaker updated successfully");
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to update speaker");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSpeakerAction(meetingId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speakers", meetingId] });
      toast.success("Speaker deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete speaker");
    },
  });

  const handleOpenCreate = () => {
    setEditingSpeaker(null);
    setFormData({ display_name: "", color_label: "blue" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    setFormData({
      display_name: speaker.display_name || speaker.speaker_label,
      color_label: speaker.color_label || "blue",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.display_name.trim()) {
      toast.error("Display name is required");
      return;
    }

    if (editingSpeaker) {
      updateMutation.mutate({ id: editingSpeaker.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this speaker? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Meeting Speakers</CardTitle>
          <CardDescription>
            Manage the list of speakers for this meeting. You can assign these speakers to transcript segments.
          </CardDescription>
        </div>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="mr-2 size-4" />
          Add Speaker
        </Button>
      </CardHeader>
      <CardContent>
        {speakers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
            <p className="text-sm text-muted-foreground">No speakers found.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleOpenCreate}>
              <Plus className="mr-2 size-4" />
              Add Speaker
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Speaker Name</TableHead>
                  <TableHead>Original Label</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {speakers.map((speaker) => {
                  const colorConfig = COLOR_OPTIONS.find((c) => c.value === speaker.color_label) || COLOR_OPTIONS[0];
                  return (
                    <TableRow key={speaker.id}>
                      <TableCell className="font-medium">
                        {speaker.display_name || speaker.speaker_label}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {speaker.speaker_label}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={colorConfig.class}>
                          {colorConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {speaker.is_confirmed ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            <Check className="mr-1 size-3" /> Confirmed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                            Unconfirmed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(speaker)}
                          >
                            <Edit2 className="size-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(speaker.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingSpeaker ? "Edit Speaker" : "Add Speaker"}</DialogTitle>
              <DialogDescription>
                {editingSpeaker
                  ? "Update the details for this speaker."
                  : "Add a new speaker to the meeting."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color_label">Color Theme</Label>
                <Select
                  value={formData.color_label}
                  onValueChange={(value) => setFormData({ ...formData, color_label: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a color" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`h-4 w-4 rounded-full ${color.class.split(' ')[0]}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingSpeaker ? "Save Changes" : "Create Speaker"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
