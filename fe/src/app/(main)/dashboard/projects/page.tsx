import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listProjectsAction } from "@/server/api-actions";

import { CreateProjectForm } from "./_components/create-project-form";

export default async function ProjectsPage() {
  const projects = await listProjectsAction().catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Projects</h1>
        <p className="text-muted-foreground text-sm">Create and manage project workspaces backed by /api/v1/projects.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription>POST /api/v1/projects</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateProjectForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project list</CardTitle>
          <CardDescription>GET /api/v1/projects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.length > 0 ? (
            projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
              >
                {project.cover_image_url ? (
                  <>
                    {/* biome-ignore lint/performance/noImgElement: Cover images come from runtime-configured storage hostnames. */}
                    <img
                      src={project.cover_image_url}
                      alt={`${project.name} cover`}
                      className="mb-3 aspect-video w-full rounded-md object-cover"
                    />
                  </>
                ) : null}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-muted-foreground text-xs">{project.code}</p>
                    {project.description ? <p className="mt-2 text-sm">{project.description}</p> : null}
                  </div>
                  <Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No projects found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
