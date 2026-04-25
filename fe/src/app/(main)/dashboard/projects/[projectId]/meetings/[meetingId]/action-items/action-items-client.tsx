"use client";

import { useCallback, useRef, useState } from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";

import {
  type ActionItem,
  type ActionItemUpdatePayload,
  createActionItemAction,
  deleteActionItemAction,
  updateActionItemAction,
} from "@/server/api-actions";

import { ActionItemCard } from "./_components/action-item-card";
import { ActionItemDetailSheet } from "./_components/action-item-detail-sheet";
import { KanbanColumn } from "./_components/kanban-column";

const COLUMN_ORDER: ActionItem["status"][] = ["open", "in_progress", "done"];

export function ActionItemsClient({ meetingId, initialItems }: { meetingId: string; initialItems: ActionItem[] }) {
  const [items, setItems] = useState<ActionItem[]>(initialItems);
  const [activeItem, setActiveItem] = useState<ActionItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null);
  // Track whether a drag actually moved the pointer (vs just a click)
  const didDragRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 8px movement before activating drag, so a simple click still works
      activationConstraint: { distance: 8 },
    }),
  );

  // Group items by status
  const columnItems = useCallback(
    (status: ActionItem["status"]) => items.filter((i) => i.status === status),
    [items],
  );

  // Drag start
  const handleDragStart = (event: DragStartEvent) => {
    didDragRef.current = true;
    const item = items.find((i) => i.id === event.active.id);
    if (item) setActiveItem(item);
  };

  // Drag end – optimistic update + API call
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    // Reset drag flag after a short delay so the card onClick doesn't fire
    setTimeout(() => { didDragRef.current = false; }, 0);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeItemData = items.find((i) => i.id === activeId);
    if (!activeItemData) return;

    // overId is either a column status ("open", "in_progress", "done") or a card UUID
    const validStatuses: ActionItem["status"][] = ["open", "in_progress", "done"];
    const isColumnDrop = validStatuses.includes(overId as ActionItem["status"]);
    const overItem = items.find((i) => i.id === overId);
    const targetStatus: ActionItem["status"] = isColumnDrop
      ? (overId as ActionItem["status"])
      : (overItem?.status ?? activeItemData.status);

    if (!validStatuses.includes(targetStatus)) return;

    const sameColumn = activeItemData.status === targetStatus;

    // Optimistic update
    setItems((prev) => {
      let updated = prev.map((i) => (i.id === activeId ? { ...i, status: targetStatus } : i));

      if (sameColumn && !isColumnDrop) {
        const activeIdx = updated.findIndex((i) => i.id === activeId);
        const overIdx = updated.findIndex((i) => i.id === overId);
        if (activeIdx !== -1 && overIdx !== -1) {
          updated = arrayMove(updated, activeIdx, overIdx);
        }
      }
      return updated;
    });

    // If status changed, persist via API
    if (!sameColumn) {
      try {
        await updateActionItemAction(meetingId, activeId, { status: targetStatus });
        toast.success("Item moved.");
      } catch {
        setItems(initialItems);
        toast.error("Failed to move item. Please try again.");
      }
    }
  };

  // Card click – only open detail if we didn't just drag
  const handleCardClick = useCallback(
    (item: ActionItem) => {
      if (!didDragRef.current) {
        setSelectedItem(item);
      }
    },
    [],
  );

  // Add card from inline form
  const handleAddCard = async (title: string, status: ActionItem["status"]) => {
    try {
      const newItem = await createActionItemAction(meetingId, {
        title,
        status,
        priority: "medium",
      });
      setItems((prev) => [...prev, newItem]);
      toast.success("Action item added.");
    } catch {
      toast.error("Failed to create action item.");
    }
  };

  // Update from detail sheet
  const handleUpdate = async (id: string, payload: ActionItemUpdatePayload) => {
    const updated = await updateActionItemAction(meetingId, id, payload);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    // Also update selectedItem to reflect new data
    setSelectedItem(updated);
  };

  // Delete from detail sheet
  const handleDelete = async (id: string) => {
    await deleteActionItemAction(meetingId, id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Action item deleted.");
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Board: 3 columns */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMN_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              items={columnItems(status)}
              onCardClick={handleCardClick}
              onAddCard={handleAddCard}
            />
          ))}
        </div>

        {/* Drag overlay – ghost card while dragging */}
        <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
          {activeItem ? <ActionItemCard item={activeItem} onClick={() => {}} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Detail sheet */}
      <ActionItemDetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </>
  );
}
