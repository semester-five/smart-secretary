"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface VersionPanelProps {
  versionNo: number;
  isCreating: boolean;
  onSnapshot: (changeNote: string) => void;
}

export function VersionPanel({ versionNo, isCreating, onSnapshot }: VersionPanelProps) {
  const [changeNote, setChangeNote] = useState("");

  const handleCreate = () => {
    onSnapshot(changeNote);
    setChangeNote("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Version snapshot</CardTitle>
        <CardDescription className="text-xs">Save current edits as v{versionNo + 1}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          placeholder="Change note (optional)"
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          disabled={isCreating}
        />
        <Button
          type="button"
          size="sm"
          className="w-full text-xs"
          disabled={isCreating}
          onClick={handleCreate}
        >
          {isCreating ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
          Create version
        </Button>
      </CardContent>
    </Card>
  );
}
