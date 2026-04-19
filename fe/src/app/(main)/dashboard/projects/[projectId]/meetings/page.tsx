import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectByIdAction, listProjectMeetingsAction } from "@/server/api-actions";

export default async function ProjectMeetingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const [project, meetings] = await Promise.all([
    getProjectByIdAction(projectId).catch(() => null),
    listProjectMeetingsAction(projectId).catch(() => []),
  ]);

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="font-semibold text-2xl">Meetings</h1>
        <p className="text-muted-foreground text-sm">Project not found or no permission.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl">Meetings</h1>
          <p className="text-muted-foreground text-sm">{project.name}</p>
        </div>
        <Link href={`/dashboard/projects/${project.id}`} className="text-primary text-sm hover:underline">
          Back to project
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meeting timeline</CardTitle>
          <CardDescription>GET /api/v1/projects/{'{projectId}'}/meetings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {meetings.length > 0 ? (
            meetings.map((meeting) => (
              <div key={meeting.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{meeting.title}</p>
                    <p className="text-muted-foreground text-xs">{new Date(meeting.meeting_date).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline">{meeting.status}</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium text-sm">No meetings yet</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Meeting create/edit APIs are not available yet, so this page is read-only for now.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
