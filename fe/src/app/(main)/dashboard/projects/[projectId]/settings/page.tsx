import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, Settings } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectByIdAction } from "@/server/api-actions";

import { UpdateProjectForm } from "../../_components/update-project-form";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectByIdAction(projectId).catch(() => null);
  return { title: project ? `Settings: ${project.name} - Smart Secretary` : "Project Settings" };
}

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const project = await getProjectByIdAction(projectId).catch(() => null);
  if (!project) {
    notFound();
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500 max-w-4xl">
      <div className="mb-2">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to overview
        </Link>
      </div>

      <div>
        <h1 className="font-semibold text-2xl tracking-tight flex items-center gap-2">
          <Settings className="size-6 text-muted-foreground" />
          Project Settings
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">Update configuration for {project.name}.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Project Configuration</CardTitle>
          <CardDescription>Update name, description, and status settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateProjectForm project={project} />
        </CardContent>
      </Card>

      <Card className="shadow-sm border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting this project will permanently remove all associated meetings, audio files, and generated
            transcripts.
          </p>
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
            <span className="text-sm font-medium text-destructive opacity-80">
              Project deletion is not available via the UI yet.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
