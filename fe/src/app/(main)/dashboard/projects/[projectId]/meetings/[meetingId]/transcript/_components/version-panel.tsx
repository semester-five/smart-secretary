"use client";

import { useState } from "react";

import { Loader2 } from "@/lib/icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { getMeetingVersionsAction } from "@/server/api-actions";
import { CompareModal } from "./compare-modal";
import { Clock } from "@/lib/icons";

interface VersionPanelProps {
  meetingId: string;
  versionNo: number;
  isCreating: boolean;
  onSnapshot: (changeNote: string) => void;
}

export function VersionPanel({
  meetingId,
  versionNo,
  isCreating,
  onSnapshot,
}: VersionPanelProps) {
  const [changeNote, setChangeNote] = useState("");
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const { data: versions = [] } = useQuery({
    queryKey: ["meeting-versions", meetingId],
    queryFn: () => getMeetingVersionsAction(meetingId),
  });

  const handleCreate = () => {
    onSnapshot(changeNote);
    setChangeNote("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Version snapshot
        </CardTitle>
        <CardDescription className="text-xs">
          Save current edits as v{versionNo + 1}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
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
            {isCreating ? (
              <Loader2 className="size-3 animate-spin mr-1" />
            ) : null}
            Create version
          </Button>
        </div>

        {versions.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" /> Version History
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="text-xs bg-muted/30 p-2 rounded border border-transparent hover:border-border"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-foreground">
                      Version {v.version_no}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {v.change_note && (
                    <p className="text-muted-foreground truncate">
                      {v.change_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      {versions.length >= 2 && (
        <CardFooter className="pt-0">
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={() => setIsCompareOpen(true)}
          >
            Compare Versions
          </Button>
        </CardFooter>
      )}

      <CompareModal
        meetingId={meetingId}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        versions={versions}
      />
    </Card>
  );
}
