"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { ActionItem } from "@/server/api-actions";

const PRIORITY_STYLES: Record<ActionItem["priority"], string> = {
  high: "bg-red-500/15 text-red-400 border border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  low: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
};

interface ActionItemCardProps {
  item: ActionItem;
  onClick: () => void;
  overlay?: boolean;
}

export function ActionItemCard({ item, onClick, overlay = false }: ActionItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (overlay) {
    return (
      <div className="cursor-grabbing rounded-lg border border-border bg-card p-3 shadow-2xl opacity-90 rotate-1">
        <p className="font-medium text-sm truncate">{item.title}</p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative rounded-lg border border-border bg-card p-3 transition-all duration-200 select-none ${
        isDragging
          ? "opacity-40 scale-95 cursor-grabbing"
          : "hover:border-border/80 hover:bg-accent/30 hover:shadow-md cursor-grab"
      }`}
      // onClick is handled in the parent (handleCardClick checks didDragRef)
      onClick={onClick}
    >
      {/* Title – truncate to 2 lines max */}
      <p className="font-medium text-sm leading-snug mb-2 line-clamp-2">{item.title}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Priority */}
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[item.priority]}`}
        >
          {item.priority}
        </span>

        {/* Due date – text only, no icon per requirements */}
        {item.due_date && (
          <span className="text-xs text-muted-foreground">
            {new Date(item.due_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "short" })}
          </span>
        )}

        {/* AI source label */}
        {item.source === "ai" && (
          <span className="ml-auto text-xs text-muted-foreground/60">AI</span>
        )}

        {/* Assignee text */}
        {item.assignee_text && (
          <span className="text-xs text-muted-foreground truncate max-w-[80px]">{item.assignee_text}</span>
        )}
      </div>
    </div>
  );
}
