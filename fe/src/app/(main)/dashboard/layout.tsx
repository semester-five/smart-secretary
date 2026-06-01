import type { ReactNode } from "react";
import { Suspense } from "react";

import { cookies } from "next/headers";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/server/queries/user-queries";
import { getCurrentUserOrRedirectLogin } from "@/server/auth-actions";

import { AccountSwitcher } from "./_components/sidebar/account-switcher";
import { AppSidebar } from "./_components/sidebar/app-sidebar";
import { LayoutControls } from "./_components/sidebar/layout-controls";
import { SearchDialog } from "./_components/sidebar/search-dialog";
import { ThemeSwitcher } from "./_components/sidebar/theme-switcher";

// ---------------------------------------------------------------------------
// AsyncSidebar — fetches user data independently so the layout
// can stream sidebar content without blocking the main page content.
// ---------------------------------------------------------------------------
async function AsyncSidebar({
  variant,
  collapsible,
}: {
  variant: React.ComponentProps<typeof AppSidebar>["variant"];
  collapsible: React.ComponentProps<typeof AppSidebar>["collapsible"];
}) {
  const user = await getCurrentUserOrRedirectLogin(() => getCurrentUser());

  return (
    <AppSidebar
      variant={variant}
      collapsible={collapsible}
      user={user ?? undefined}
    />
  );
}

// Minimal skeleton for sidebar while AsyncSidebar loads
function SidebarSkeleton() {
  return (
    <div className="flex h-screen w-[--sidebar-width] flex-col gap-4 border-r bg-sidebar p-4 [--sidebar-width:16rem]">
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="h-5 w-5 rounded bg-sidebar-foreground/10" />
        <div className="h-4 w-28 rounded bg-sidebar-foreground/10" />
      </div>
      <div className="space-y-1 px-2">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton only
          <div
            key={i}
            className="h-8 w-full rounded-md bg-sidebar-foreground/10"
          />
        ))}
      </div>
    </div>
  );
}

export default async function Layout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // Read cookies directly — no async Server Action overhead for simple reads.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // Read sidebar preferences directly from cookies without going through
  // async Server Actions — these are simple string reads with no network I/O.
  const rawVariant = cookieStore.get("sidebar_variant")?.value;
  const rawCollapsible = cookieStore.get("sidebar_collapsible")?.value;
  const variant =
    rawVariant === "inset" ||
    rawVariant === "floating" ||
    rawVariant === "sidebar"
      ? rawVariant
      : "inset";
  const collapsible =
    rawCollapsible === "icon" ||
    rawCollapsible === "none" ||
    rawCollapsible === "offcanvas"
      ? rawCollapsible
      : "icon";

  // Read the current user to pass isSuperuser to SearchDialog and AccountSwitcher.
  // We still need this for the header section. However, we use the cached query
  // so it is deduplicated with the page component.
  const currentUser = await getCurrentUser().catch(() => null);

  const sidebarUsers = currentUser
    ? [
        {
          id: String(currentUser.id),
          name: currentUser.username,
          email: currentUser.email,
          avatar: currentUser.avatar_url ?? "",
          role: currentUser.is_superuser ? "superuser" : "member",
        },
      ]
    : [];

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {/*
       * AsyncSidebar is wrapped in Suspense so that the sidebar can stream in
       * independently. The SidebarSkeleton is shown instantly while the
       * sidebar fetches user data (which is now deduped via React cache()).
       */}
      <Suspense fallback={<SidebarSkeleton />}>
        <AsyncSidebar variant={variant} collapsible={collapsible} />
      </Suspense>
      <SidebarInset
        className={cn(
          "[html[data-content-layout=centered]_&]:mx-auto! [html[data-content-layout=centered]_&]:max-w-screen-2xl!",
          // Adds right margin for inset sidebar in centered layout up to 113rem.
          // On wider screens with collapsed sidebar, removes margin and sets margin auto for alignment.
          "max-[113rem]:peer-data-[variant=inset]:mr-2! min-[101rem]:peer-data-[variant=inset]:peer-data-[state=collapsed]:mr-auto!",
        )}
      >
        <header
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
            // Handle sticky navbar style with conditional classes so blur, background, z-index, and rounded corners remain consistent across all SidebarVariant layouts.
            "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
          )}
        >
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
              />
              <SearchDialog isSuperuser={currentUser?.is_superuser} />
            </div>
            <div className="flex items-center gap-2">
              <LayoutControls />
              <ThemeSwitcher />
              {sidebarUsers.length > 0 ? (
                <AccountSwitcher users={sidebarUsers} />
              ) : null}
            </div>
          </div>
        </header>
        <div className="h-full p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
