import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { CreateProjectForm } from "../_components/create-project-form";

export const metadata = {
  title: "Create Project - Smart Secretary",
};

export default function CreateProjectPage() {
  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <div>
        <h1 className="font-semibold text-2xl">Create Project</h1>
        <p className="text-muted-foreground text-sm">Set up a new workspace for your organization.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <CardDescription>Fill in the required information below</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
