import { redirect } from "next/navigation";

import { getCurrentUserAction } from "@/server/api-actions";
import { getCurrentUserOrRedirectLogin } from "@/server/auth-actions";

export default async function DashboardNotFound() {
  const currentUser = await getCurrentUserOrRedirectLogin(() =>
    getCurrentUserAction(),
  );

  if (!currentUser) {
    redirect("/auth/v1/login");
  }

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">Page not found.</h1>
      <p className="text-muted-foreground">
        This section will be added in future updates.
      </p>
    </div>
  );
}
