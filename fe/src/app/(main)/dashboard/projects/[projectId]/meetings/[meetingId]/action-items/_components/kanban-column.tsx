"use client";

import { useState } from "react";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ActionItem } from "@/server/api-actions";

import { ActionItemCard } from "./action-item-card";
import { AddCardForm } from "./add-card-form";

type ColumnConfig = {
  label: string;
  headerColor: string;
  borderColor: string;
  badgeColor: string;
};

const COLUMN_CONFIG: Record<ActionItem["status"], ColumnConfig> = {
  open: {
    label: "Todo",
    headerColor: "text-blue-400",
    borderColor: "border-t-blue-500",
    badgeColor: "bg-blue-500/15 text-blue-400",
  },
  in_progress: {
    label: "In Progress",
    headerColor: "text-amber-400",
    borderColor: "border-t-amber-500",
    badgeColor: "bg-amber-500/15 text-amber-400",
  },
  done: {
    label: "Done",
    headerColor: "text-emerald-400",
    borderColor: "border-t-emerald-500",
    badgeColor: "bg-emerald-500/15 text-emerald-400",
  },
};

interface KanbanColumnProps {
  status: ActionItem["status"];
  items: ActionItem[];
  onCardClick: (item: ActionItem) => void;
  onAddCard: (title: string, status: ActionItem["status"]) => Promise<void>;
}

export function KanbanColumn({ status, items, onCardClick, onAddCard }: KanbanColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const config = COLUMN_CONFIG[status];
  const ids = items.map((i) => i.id);

  // Register column as a droppable zone so cards can be dropped into empty columns
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div
      className={`flex flex-col rounded-xl border border-border border-t-2 bg-muted/30 min-h-[400px] w-full ${config.borderColor}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className={`flex items-center gap-2 font-semibold text-sm ${config.headerColor}`}>
          <span>{config.label}</span>
          <span
            className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${config.badgeColor}`}
          >
            {items.length}
          </span>
        </div>
      </div>

      {/* Cards – droppable zone covers entire card list area */}
      <div ref={setNodeRef} className="flex-1 px-2 pb-2 space-y-2">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <ActionItemCard key={item.id} item={item} onClick={() => onCardClick(item)} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {items.length === 0 && !isAdding && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
            <p className="text-xs">No items</p>
          </div>
        )}

        {/* Inline add form */}
        {isAdding && (
          <AddCardForm
            status={status}
            onAdd={async (title, s) => {
              await onAddCard(title, s);
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
          />
        )}
      </div>

      {/* Add card button */}
      {!isAdding && (
        <div className="px-2 pb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-8 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="size-3.5" />
            Add card
          </Button>
        </div>
      )}
    </div>
  );
}
