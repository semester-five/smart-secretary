import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserAction } from "@/server/api-actions";

import { UpdateProfileForm } from "./_components/update-profile-form";

export default async function ProfilePage() {
  const currentUser = await getCurrentUserAction().catch(() => null);

  if (!currentUser) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your display name and avatar.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>PATCH /api/v1/users/me</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateProfileForm currentUser={currentUser} />
        </CardContent>
      </Card>
    </div>
  );
}
