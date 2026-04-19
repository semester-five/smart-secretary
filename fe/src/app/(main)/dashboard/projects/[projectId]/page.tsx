import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, User, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectByIdAction, listProjectMeetingsAction } from "@/server/api-actions";

import { UpdateProjectForm } from "../_components/update-project-form";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectByIdAction(projectId).catch(() => null);
  return { title: project ? `${project.name} - Smart Secretary` : "Project Details" };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const project = await getProjectByIdAction(projectId).catch(() => null);
  if (!project) {
    notFound();
  }

  const meetings = await listProjectMeetingsAction(project.id).catch(() => []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <div className="mb-2">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to all projects
        </Link>
      </div>

      {project.cover_image_url ? (
        <div className="overflow-hidden rounded-xl border object-cover shadow-sm">
          {/* biome-ignore lint/performance/noImgElement: Cover images come from runtime-configured storage hostnames. */}
          <img
            src={project.cover_image_url}
            alt={`${project.name} cover`}
            className="aspect-[21/9] w-full object-cover md:aspect-[32/9]"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">{project.name}</h1>
          <p className="font-mono text-muted-foreground text-sm mt-1">Code: {project.code}</p>
        </div>
        <Badge variant={project.status === "active" ? "default" : "secondary"} className="h-6 px-3">
          {project.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Owner ID</CardTitle>
            <User className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-xl truncate" title={String(project.owner_id)}>
              {project.owner_id}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Created</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-xl">{new Date(project.created_at).toLocaleDateString()}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Meetings</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-xl">{meetings.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Project Configuration</CardTitle>
            <CardDescription>Update name, description, and status settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <UpdateProjectForm project={project} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider px-1">Quick Links</h3>
          <Link
            href={`/dashboard/projects/${project.id}/members`}
            className="group flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div>
              <p className="font-medium group-hover:text-primary transition-colors">Manage Members</p>
              <p className="text-muted-foreground text-xs mt-1">Add or remove teammates</p>
            </div>
            <Users className="size-5 text-muted-foreground transition-transform group-hover:scale-110 group-hover:text-primary" />
          </Link>
          <Link
            href={`/dashboard/projects/${project.id}/meetings`}
            className="group flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div>
              <p className="font-medium group-hover:text-primary transition-colors">View Meetings</p>
              <p className="text-muted-foreground text-xs mt-1">Schedules and meeting history</p>
            </div>
            <Calendar className="size-5 text-muted-foreground transition-transform group-hover:scale-110 group-hover:text-primary" />
          </Link>
        </div>
      </div>
    </div>
  );
}
