"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { ActionItem } from "@/server/api-actions";

const PRIORITY_STYLES: Record<ActionItem["priority"], string> = {
  high: "border border-red-500/30 bg-red-500/15 text-red-400",
  medium: "border border-amber-500/30 bg-amber-500/15 text-amber-400",
  low: "border border-blue-500/30 bg-blue-500/15 text-blue-400",
};

interface ActionItemCardProps {
  item: ActionItem;
  onClick: () => void;
  overlay?: boolean;
}

export function ActionItemCard({
  item,
  onClick,
  overlay = false,
}: ActionItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (overlay) {
    return (
      <div className="rotate-1 cursor-grabbing rounded-lg border border-border bg-card p-3 opacity-90 shadow-2xl">
        <p className="truncate font-medium text-sm">{item.title}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative select-none rounded-lg border border-border bg-card p-3 text-left transition-all duration-200 ${
        isDragging
          ? "scale-95 cursor-grabbing opacity-40"
          : "cursor-grab hover:border-border/80 hover:bg-accent/30 hover:shadow-md"
      }`}
      // onClick is handled in the parent (handleCardClick checks didDragRef)
      onClick={onClick}
    >
      {/* Title – truncate to 2 lines max */}
      <p className="mb-2 line-clamp-2 font-medium text-sm leading-snug">
        {item.title}
      </p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Priority */}
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${PRIORITY_STYLES[item.priority]}`}
        >
          {item.priority}
        </span>

        {/* Due date – text only, no icon per requirements */}
        {item.due_date && (
          <span className="text-muted-foreground text-xs">
            {new Date(item.due_date).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        )}

        {/* AI source label */}
        {item.source === "ai" && (
          <span className="ml-auto text-muted-foreground/60 text-xs">AI</span>
        )}

        {/* Assignee text */}
        {item.assignee_text && (
          <span className="max-w-[80px] truncate text-muted-foreground text-xs">
            {item.assignee_text}
          </span>
        )}
      </div>
    </button>
  );
}
