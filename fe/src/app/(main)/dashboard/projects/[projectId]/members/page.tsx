import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectByIdAction, listUsersAction } from "@/server/api-actions";
import { ArrowLeft } from "lucide-react";

import { ManageMembersForm } from "../../_components/manage-members-form";

export default async function ProjectMembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const [project, usersResponse] = await Promise.all([
    getProjectByIdAction(projectId).catch(() => null),
    listUsersAction(1, 200).catch(() => ({ data: [] })),
  ]);

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="font-semibold text-2xl">Members</h1>
        <p className="text-muted-foreground text-sm">Project not found or no permission.</p>
      </div>
    );
  }

  const users = usersResponse.data ?? [];

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
          <CardDescription>Add and remove teammates from this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <ManageMembersForm projectId={project.id} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
