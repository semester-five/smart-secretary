import Link from "next/link";

import { ArrowLeft, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getProjectByIdAction } from "@/server/api-actions";

import { ManageMembersForm } from "../../_components/manage-members-form";

export default async function ProjectMembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const project = await getProjectByIdAction(projectId).catch(() => null);

  if (!project) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldAlert className="size-6 text-destructive" />
          </EmptyMedia>
          <EmptyTitle>Project unavailable</EmptyTitle>
          <EmptyDescription>Project not found or you don't have permission to view its members.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <div className="mb-2">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to configuration
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Project Members</h1>
          <p className="text-muted-foreground text-sm mt-1">{project.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage membership</CardTitle>
          <CardDescription>Search, add, and remove project members.</CardDescription>
        </CardHeader>
        <CardContent>
          <ManageMembersForm projectId={project.id} />
        </CardContent>
      </Card>
    </div>
  );
}
