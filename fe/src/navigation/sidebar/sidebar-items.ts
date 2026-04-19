import { CircleUser, FolderKanban, type LucideIcon, Users } from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Workspace",
    items: [
      {
        title: "Projects",
        url: "/dashboard/projects",
        icon: FolderKanban,
        subItems: [
          {
            title: "All Projects",
            url: "/dashboard/projects",
          },
          {
            title: "Create Project",
            url: "/dashboard/projects/create",
          },
        ],
      },
      {
        title: "Profile",
        url: "/dashboard/profile",
        icon: CircleUser,
      },
      {
        title: "Users",
        url: "/dashboard/users",
        icon: Users,
      },
    ],
  },
];
