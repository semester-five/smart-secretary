import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserAction, healthCheckAction, listUsersAction } from "@/server/api-actions";

export default async function Page() {
  const [currentUser, health] = await Promise.all([
    getCurrentUserAction().catch(() => null),
    healthCheckAction().catch(() => ({ status: "unavailable" })),
  ]);

  const users = currentUser?.is_superuser ? await listUsersAction().catch(() => null) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Connected to backend APIs with automatic token refresh.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Backend Health</CardTitle>
            <CardDescription>Data from GET /health</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={health.status === "ok" ? "default" : "destructive"}>{health.status}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
            <CardDescription>Data from GET /api/v1/users/me</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {currentUser ? (
              <>
                <p>
                  <span className="font-medium">Username:</span> {currentUser.username}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {currentUser.email}
                </p>
                <p>
                  <span className="font-medium">Role:</span> {currentUser.is_superuser ? "superuser" : "member"}
                </p>
                <p>
                  <span className="font-medium">Active:</span> {currentUser.is_active ? "yes" : "no"}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Not authenticated.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {currentUser?.is_superuser ? (
        <Card>
          <CardHeader>
            <CardTitle>User List</CardTitle>
            <CardDescription>Data from GET /api/v1/users (superuser only)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {users?.data && users.data.length > 0 ? (
              users.data.map((user) => (
                <div key={user.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{user.username}</p>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No users returned.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
