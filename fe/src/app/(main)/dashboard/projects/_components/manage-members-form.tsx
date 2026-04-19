"use client";

import { useEffect, useState, useTransition } from "react";

import { Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectMemberListItem } from "@/server/api-actions";
import { addProjectMemberAction, listProjectMembersAction, removeProjectMemberAction } from "@/server/api-actions";

const PAGE_SIZE = 10;

export function ManageMembersForm({ projectId }: { projectId: string }) {
  const [members, setMembers] = useState<ProjectMemberListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "editor" | "viewer">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"editor" | "viewer">("viewer");
  const [memberToDelete, setMemberToDelete] = useState<ProjectMemberListItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchMembers = async (
    nextPage: number,
    nextSearch: string,
    nextRole: "all" | "owner" | "editor" | "viewer",
  ) => {
    setIsLoading(true);
    try {
      const response = await listProjectMembersAction(projectId, {
        page: nextPage,
        items_per_page: PAGE_SIZE,
        search: nextSearch || undefined,
        role: nextRole === "all" ? undefined : nextRole,
        sort_by: "created_at",
        sort_order: "desc",
      });
      setMembers(response.data);
      setTotalPages(response.total_pages);
      setTotalMembers(response.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load members.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(page, searchTerm, roleFilter);
  }, [page, searchTerm, roleFilter]);

  const onSearchSubmit = () => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const onAddMember = () => {
    if (!email.trim()) {
      toast.error("Please enter user email.");
      return;
    }

    startTransition(async () => {
      try {
        await addProjectMemberAction(projectId, {
          email: email.trim(),
          member_role: memberRole,
        });
        toast.success("Member added.");
        setEmail("");
        setMemberRole("viewer");
        setIsAddDialogOpen(false);
        await fetchMembers(1, searchTerm, roleFilter);
        setPage(1);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add member.");
      }
    });
  };

  const onRemoveMember = () => {
    if (!memberToDelete) {
      return;
    }

    startTransition(async () => {
      try {
        await removeProjectMemberAction(projectId, memberToDelete.user_id);
        toast.success("Member removed.");
        setMemberToDelete(null);
        await fetchMembers(page, searchTerm, roleFilter);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to remove member.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-[1fr_180px_auto]">
          <div>
            <label className="mb-1 block font-medium text-sm" htmlFor="member-search">
              Search member
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                id="member-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onSearchSubmit();
                }}
                placeholder="Search by name or email"
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-medium text-sm" htmlFor="member-role-filter">
              Role
            </label>
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value as "all" | "owner" | "editor" | "viewer");
                setPage(1);
              }}
            >
              <SelectTrigger id="member-role-filter">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="owner">owner</SelectItem>
                <SelectItem value="editor">editor</SelectItem>
                <SelectItem value="viewer">viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end justify-center md:justify-start">
            <Button type="button" variant="outline" onClick={onSearchSubmit} className="min-w-20">
              Search
            </Button>
          </div>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <Button type="button" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add member
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add member to project</DialogTitle>
              <DialogDescription>Add a user by email with editor or viewer role.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="member-email">
                  Email
                </label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="member-role">
                  Role
                </label>
                <Select value={memberRole} onValueChange={(value) => setMemberRole(value as "editor" | "viewer")}>
                  <SelectTrigger id="member-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">editor</SelectItem>
                    <SelectItem value="viewer">viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={isPending} onClick={onAddMember}>
                {isPending ? "Adding..." : "Add member"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : members.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-12">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Users className="size-6 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle>No members found</EmptyTitle>
                      <EmptyDescription>
                        {searchInput || roleFilter !== "all"
                          ? "No members match your search criteria."
                          : "There are no members in this project yet."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id} className="transition-colors hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={member.user_avatar_url ?? undefined} alt={member.user_full_name} />
                        <AvatarFallback className="text-[10px] font-medium uppercase bg-primary/10 text-primary">
                          {member.user_full_name
                            ?.split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{member.user_full_name}</span>
                        <span className="text-xs text-muted-foreground">{member.user_email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.member_role === "owner" ? (
                      <Badge variant="default">Owner</Badge>
                    ) : member.member_role === "editor" ? (
                      <Badge variant="secondary">Editor</Badge>
                    ) : (
                      <Badge variant="outline">Viewer</Badge>
                    )}
                  </TableCell>
                  <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isPending || member.member_role === "owner"}
                      onClick={() => setMemberToDelete(member)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <span className="text-muted-foreground">{totalMembers} members</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending || isLoading || page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <span>
              Page {totalPages === 0 ? 0 : page}/{totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending || isLoading || totalPages === 0 || page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={memberToDelete !== null} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete member</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToDelete
                ? `Remove ${memberToDelete.user_full_name} from this project? This action cannot be undone.`
                : "Are you sure you want to remove this member?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onRemoveMember}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
