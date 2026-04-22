"use client";

import { useEffect, useRef, useState } from "react";

import { Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionItem } from "@/server/api-actions";

interface AddCardFormProps {
  status: ActionItem["status"];
  onAdd: (title: string, status: ActionItem["status"]) => Promise<void>;
  onCancel: () => void;
}

export function AddCardForm({ status, onAdd, onCancel }: AddCardFormProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await onAdd(trimmed, status);
      setTitle("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title..."
        className="text-sm h-8 bg-background"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        disabled={isSubmitting}
      />
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
          Add card
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
