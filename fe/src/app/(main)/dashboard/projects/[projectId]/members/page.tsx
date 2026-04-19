import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectByIdAction, listUsersAction } from "@/server/api-actions";

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl">Project Members</h1>
          <p className="text-muted-foreground text-sm">{project.name}</p>
        </div>
        <Link href={`/dashboard/projects/${project.id}`} className="text-primary text-sm hover:underline">
          Back to project
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage membership</CardTitle>
          <CardDescription>
            Add and remove members with available APIs. Member list endpoint is not available yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManageMembersForm projectId={project.id} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
