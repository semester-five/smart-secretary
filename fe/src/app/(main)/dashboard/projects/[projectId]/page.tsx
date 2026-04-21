import Link from "next/link";
import { notFound } from "next/navigation";

import { Calendar, Clock, PlayCircle, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectByIdAction, listProjectMeetingsAction } from "@/server/api-actions";

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
            <div className="truncate font-mono text-sm text-muted-foreground" title={String(project.owner_id)}>
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

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Get started</CardTitle>
          <CardDescription>Jump directly into what matters most for this project.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/dashboard/projects/${project.id}/meetings`}
            className="group flex items-center gap-4 rounded-xl border bg-muted/20 p-4 transition-all hover:border-primary/50 hover:bg-muted/40"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <PlayCircle className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold group-hover:text-primary transition-colors">Go to Meetings</p>
              <p className="mt-0.5 text-muted-foreground text-xs">Create, upload, and review your meeting records.</p>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
