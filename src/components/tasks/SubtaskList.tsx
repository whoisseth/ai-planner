"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubTaskData } from "@/types/task";
import { SubtaskItem } from "./SubtaskItem";

interface SubtaskListProps {
  subtasks: SubTaskData[];
  onStatusChange: (subtaskId: string) => void;
  onUpdate: (subtaskId: string, data: Partial<SubTaskData>) => void;
  onDelete: (subtaskId: string) => void;
  onAdd: (title: string) => void;
  onAddWithDetails: () => void;
  onSetDueDate: (subtaskId: string) => void;
}

export function SubtaskList({
  subtasks,
  onStatusChange,
  onUpdate,
  onDelete,
  onAdd,
  onAddWithDetails,
  onSetDueDate,
}: SubtaskListProps) {
  const [quickAddSubtask, setQuickAddSubtask] = useState("");

  const handleQuickAdd = () => {
    if (quickAddSubtask.trim()) {
      onAdd(quickAddSubtask);
      setQuickAddSubtask("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && quickAddSubtask.trim()) {
      handleQuickAdd();
    }
  };

  return (
    <div className="space-y-1 pl-8">
      {subtasks.length > 0 ? (
        subtasks.map((subtask) => (
          <SubtaskItem
            key={subtask.id}
            subtask={subtask}
            onStatusChange={onStatusChange}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSetDueDate={onSetDueDate}
          />
        ))
      ) : (
        <div className="text-sm text-muted-foreground">No subtasks</div>
      )}
      <div className="flex flex-col gap-2 pt-1">
        <div className="relative flex items-center gap-2">
          <div className="group/input relative flex-1">
            <div className="pointer-events-none absolute left-2 top-1/2 flex -translate-y-1/2 items-center">
              <Plus className="h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-focus-within/input:text-primary/70" />
            </div>
            <Input
              placeholder="Add a quick subtask..."
              value={quickAddSubtask}
              onChange={(e) => setQuickAddSubtask(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "h-8 bg-transparent pl-8 pr-16 text-sm transition-colors",
                "border-muted hover:border-input focus:border-input",
                "placeholder:text-muted-foreground/50",
                quickAddSubtask.trim() && "pr-20",
              )}
            />
            {quickAddSubtask.trim() && (
              <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 bg-background/80 backdrop-blur-sm">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                  onClick={handleQuickAdd}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setQuickAddSubtask("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex h-8 items-center gap-1.5 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={onAddWithDetails}
          >
            <Plus className="h-3.5 w-3.5" />
            Details
          </Button>
        </div>
      </div>
    </div>
  );
}
