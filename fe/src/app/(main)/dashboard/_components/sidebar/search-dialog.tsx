"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useNavigationItems } from "@/hooks/use-navigation-items";

export function SearchDialog({ isSuperuser }: { isSuperuser?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const navGroups = useNavigationItems({ isSuperuser });

  // Flatten groups into a search-friendly list, expanding subItems
  const searchGroups = React.useMemo(
    () =>
      navGroups.map((group) => ({
        label: group.label ?? "Navigation",
        items: group.items.flatMap((item) => {
          const rows = [];
          // If item has subItems, expose each sub as its own row
          if (item.subItems?.length) {
            for (const sub of item.subItems) {
              rows.push({
                label: sub.title,
                parentLabel: item.title,
                url: sub.url,
                icon: sub.icon ?? item.icon,
              });
            }
          } else {
            rows.push({
              label: item.title,
              parentLabel: undefined,
              url: item.url,
              icon: item.icon,
            });
          }
          return rows;
        }),
      })),
    [navGroups],
  );

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="link"
        className="px-0! font-normal text-muted-foreground hover:no-underline"
        aria-label="Open search"
      >
        <Search data-icon="inline-start" />
        Search
        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium text-[10px]">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Search pages and features…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {searchGroups.map((group, index) => (
              <React.Fragment key={group.label}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={group.label}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={item.url}
                        value={`${item.parentLabel ?? ""} ${item.label}`}
                        onSelect={() => handleSelect(item.url)}
                        className="gap-2"
                      >
                        {Icon && <Icon className="size-4 text-muted-foreground shrink-0" />}
                        <span>{item.label}</span>
                        {item.parentLabel && (
                          <span className="ml-auto text-xs text-muted-foreground opacity-70">{item.parentLabel}</span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
