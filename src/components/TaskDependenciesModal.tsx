// src/components/TaskDependenciesModal.tsx

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { ExtendedTaskData } from "@/components/TaskItem";
import { updateTaskDependencies, getTaskDependencies } from "@/services/tasks";
import { cn } from "@/lib/utils";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskDependencies } from "@/db/schema";
import { getCurrentUser } from "@/app/api/_lib/session";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

interface TaskDependenciesModalProps {
  task: ExtendedTaskData;
  isOpen: boolean;
  onClose: () => void;
  allTasks: ExtendedTaskData[];
  onDependenciesChange: (dependencyIds: string[]) => void;
}

// Schema for updating task dependencies
const updateDependenciesSchema = z.object({
  dependencyIds: z.array(z.string()),
});

// Replace the SQL query with a simpler approach
async function checkDependencyCycle(
  taskId: string,
  dependencyId: string
): Promise<boolean> {
  const visited = new Set<string>();
  const stack = new Set<string>();

  async function dfs(currentTaskId: string): Promise<boolean> {
    if (stack.has(currentTaskId)) {
      return true; // Found a cycle
    }
    if (visited.has(currentTaskId)) {
      return false; // Already checked this path
    }

    visited.add(currentTaskId);
    stack.add(currentTaskId);

    const dependencies = await db
      .select({
        prerequisiteTaskId: taskDependencies.prerequisiteTaskId,
      })
      .from(taskDependencies)
      .where(eq(taskDependencies.dependentTaskId, currentTaskId));

    for (const dep of dependencies) {
      if (await dfs(dep.prerequisiteTaskId)) {
        return true;
      }
    }

    stack.delete(currentTaskId);
    return false;
  }

  return dfs(dependencyId);
}

export function TaskDependenciesModal({
  task,
  isOpen,
  onClose,
  allTasks,
  onDependenciesChange,
}: TaskDependenciesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(
    task.dependencies || []
  );
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setSelectedDependencies(task.dependencies || []);
  }, [task.dependencies]);

  const filteredTasks = allTasks.filter(
    (t) =>
      t.id !== task.id &&
      !t.isDeleted &&
      (t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToggleDependency = (taskId: string) => {
    setSelectedDependencies((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSave = async () => {
    try {
      setIsUpdating(true);
      await updateTaskDependencies(task.id, selectedDependencies);
      onDependenciesChange(selectedDependencies);
      toast({
        title: "Dependencies updated",
        description: "Task dependencies have been updated successfully.",
      });
      onClose();
    } catch (error) {
      console.error("Failed to update dependencies:", error);
      toast({
        title: "Error",
        description: "Failed to update task dependencies",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col gap-0">
        <DialogHeader>
          <DialogTitle>Manage Dependencies</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden p-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search Tasks</Label>
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or description..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Available Tasks</Label>
              <ScrollArea className="h-[300px] mt-1.5 rounded-md border">
                <div className="p-4 space-y-2">
                  {filteredTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No tasks found
                    </p>
                  ) : (
                    filteredTasks.map((t) => (
                      <div
                        key={t.id}
                        className={cn(
                          "flex items-start gap-2 p-2 rounded-md transition-colors",
                          "hover:bg-accent/50 cursor-pointer"
                        )}
                        onClick={() => handleToggleDependency(t.id)}
                      >
                        <Checkbox
                          checked={selectedDependencies.includes(t.id)}
                          onCheckedChange={() => handleToggleDependency(t.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{t.title}</p>
                          {t.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {t.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 