import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserAction, listUsersAction } from "@/server/api-actions";

export default async function UsersPage() {
  const currentUser = await getCurrentUserAction().catch(() => null);

  if (!currentUser?.is_superuser) {
    redirect("/unauthorized");
  }

  const usersResponse = await listUsersAction().catch(() => ({ data: [] }));
  const users = usersResponse.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Users</h1>
        <p className="text-muted-foreground text-sm">Superuser view backed by GET /api/v1/users.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User directory</CardTitle>
          <CardDescription>Showing {users.length} account(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.length > 0 ? (
            users.map((user) => (
              <div key={user.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{user.full_name || user.username}</p>
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.is_active ? "default" : "destructive"}>
                      {user.is_active ? "active" : "inactive"}
                    </Badge>
                    <Badge variant="outline">{user.status}</Badge>
                    {user.is_superuser ? <Badge variant="secondary">superuser</Badge> : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No users returned.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
