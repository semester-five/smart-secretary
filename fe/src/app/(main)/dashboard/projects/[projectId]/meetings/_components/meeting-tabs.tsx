"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Captions, CheckSquare, FileText, LayoutDashboard, Mic } from "lucide-react";

import { cn } from "@/lib/utils";

// Icon mapping lives in the Client Component so no component refs cross the server/client boundary
const ICON_MAP = {
  overview: LayoutDashboard,
  audio: Mic,
  transcript: Captions,
  summary: FileText,
  "action-items": CheckSquare,
} as const;

export type MeetingTabIcon = keyof typeof ICON_MAP;

export interface MeetingTab {
  title: string;
  href: string;
  iconKey: MeetingTabIcon;
  exact?: boolean;
}

export function MeetingTabs({ tabs }: { readonly tabs: MeetingTab[] }) {
  const pathname = usePathname();

  return (
    <div className="border-b border-border mb-6">
      <nav className="-mb-px flex overflow-x-auto space-x-6" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = ICON_MAP[tab.iconKey];
          return (
            <Link
              key={tab.title}
              href={tab.href}
              className={cn(
                "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn("size-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground")}
                aria-hidden="true"
              />
              {tab.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
