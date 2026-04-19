import Link from "next/link";

import { FolderOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { listProjectsAction } from "@/server/api-actions";

export const metadata = {
  title: "Projects - Smart Secretary",
};

export default async function ProjectsPage() {
  const projects = await listProjectsAction().catch(() => []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <div>
        <h1 className="font-semibold text-2xl">Projects</h1>
        <p className="text-muted-foreground text-sm">Explore and manage all initialized workspaces.</p>
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md"
            >
              {project.cover_image_url ? (
                // biome-ignore lint/performance/noImgElement: Cover images come from runtime-configured storage hostnames.
                <img
                  src={project.cover_image_url}
                  alt={`${project.name} cover`}
                  className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-muted/30">
                  <FolderOpen className="size-10 text-muted-foreground/30" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg tracking-tight">{project.name}</h3>
                    <p className="text-muted-foreground text-xs font-mono">{project.code}</p>
                  </div>
                  <Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge>
                </div>
                {project.description ? (
                  <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center animate-in fade-in zoom-in-95">
          <FolderOpen className="mb-4 size-10 text-muted-foreground" />
          <h3 className="font-semibold text-lg">No projects found</h3>
          <p className="mt-1 text-muted-foreground text-sm">Get started by creating a new project workspace.</p>
          <Link
            href="/dashboard/projects/create"
            className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Create Project
          </Link>
        </div>
      )}
    </div>
  );
}
