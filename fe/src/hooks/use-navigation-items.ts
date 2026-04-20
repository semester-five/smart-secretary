"use client";

import { useMemo } from "react";

import { useParams } from "next/navigation";

import { Calendar, FolderKanban, Settings, Users } from "lucide-react";

import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import type { NavGroup } from "@/navigation/sidebar/sidebar-items";

interface UseNavigationItemsOptions {
  isSuperuser?: boolean;
}

/**
 * Returns the full list of sidebar nav groups, dynamically injecting a
 * "Project Workspace" group when a projectId is present in the URL params.
 * This hook is shared between AppSidebar and SearchDialog to stay in sync.
 */
export function useNavigationItems({ isSuperuser }: UseNavigationItemsOptions = {}): NavGroup[] {
  const params = useParams<{ projectId?: string }>();
  const projectId = params?.projectId;

  return useMemo<NavGroup[]>(() => {
    const defaultGroups = sidebarItems
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.title !== "Users" || Boolean(isSuperuser)),
      }))
      .filter((group) => group.items.length > 0);

    if (projectId) {
      const projectGroup: NavGroup = {
        id: 999,
        label: "Project Workspace",
        items: [
          {
            title: "Overview",
            url: `/dashboard/projects/${projectId}`,
            icon: FolderKanban,
          },
          {
            title: "Meetings",
            url: `/dashboard/projects/${projectId}/meetings`,
            icon: Calendar,
          },
          {
            title: "Members",
            url: `/dashboard/projects/${projectId}/members`,
            icon: Users,
          },
          {
            title: "Settings",
            url: `/dashboard/projects/${projectId}/settings`,
            icon: Settings,
          },
        ],
      };
      return [projectGroup, ...defaultGroups];
    }
    return defaultGroups;
  }, [isSuperuser, projectId]);
}
