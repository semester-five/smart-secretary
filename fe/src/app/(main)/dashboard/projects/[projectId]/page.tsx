import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectByIdAction, listProjectMeetingsAction } from "@/server/api-actions";

import { UpdateProjectForm } from "../_components/update-project-form";

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const project = await getProjectByIdAction(projectId).catch(() => null);
  if (!project) {
    notFound();
  }

  const meetings = await listProjectMeetingsAction(project.id).catch(() => []);

  return (
    <div className="space-y-6">
      {project.cover_image_url ? (
        <div className="overflow-hidden rounded-lg border">
          {/* biome-ignore lint/performance/noImgElement: Cover images come from runtime-configured storage hostnames. */}
          <img
            src={project.cover_image_url}
            alt={`${project.name} cover`}
            className="aspect-video w-full object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl">{project.name}</h1>
          <p className="text-muted-foreground text-sm">Code: {project.code}</p>
        </div>
        <Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Owner ID</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">{project.owner_id}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Created</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{new Date(project.created_at).toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Meetings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{meetings.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update project</CardTitle>
          <CardDescription>PATCH /api/v1/projects/{'{projectId}'}</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateProjectForm project={project} />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Link href={`/dashboard/projects/${project.id}/members`} className="rounded-lg border p-4 hover:bg-muted/40">
          <p className="font-medium">Manage members</p>
          <p className="text-muted-foreground text-sm">POST/DELETE /api/v1/projects/{'{projectId}'}/members</p>
        </Link>
        <Link href={`/dashboard/projects/${project.id}/meetings`} className="rounded-lg border p-4 hover:bg-muted/40">
          <p className="font-medium">View meetings</p>
          <p className="text-muted-foreground text-sm">GET /api/v1/projects/{'{projectId}'}/meetings</p>
        </Link>
      </div>
    </div>
  );
}
