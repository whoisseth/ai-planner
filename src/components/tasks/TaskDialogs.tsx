"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { SubTaskData } from "@/types/task";
import { TaskDialogsProps } from "@/types/TaskItemTypes";
import { TagInput } from "@/components/TagInput";
import { TaskEditDialog } from "@/components/TaskEditDialog";
import { TaskDependenciesModal } from "@/components/TaskDependenciesModal";

export function TaskDialogs({
  task,
  state,
  onStateChange,
  onUpdate,
  lists = [],
  onCreateList,
  allTasks = [],
  onTagsChange,
  onDependenciesChange,
  onCreateSubtask,
  isLoadingSubtask,
}: TaskDialogsProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDescription, setNewSubtaskDescription] = useState("");

  return (
    <>
      <TaskEditDialog
        open={state.isEditDialogOpen}
        onOpenChange={(open) =>
          onStateChange({ isEditDialogOpen: open })
        }
        task={task}
        lists={lists}
        onUpdate={(data) => onUpdate(task.id, { ...task, ...data })}
        onCreateList={onCreateList}
      />

      <Dialog
        open={state.isSubtaskDialogOpen}
        onOpenChange={(open) => {
          onStateChange({ isSubtaskDialogOpen: open });
          if (!open) {
            setNewSubtaskTitle("");
            setNewSubtaskDescription("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subtask</DialogTitle>
            <DialogDescription>
              Create a new subtask for {task.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (newSubtaskTitle.trim()) {
              await onCreateSubtask({ 
                title: newSubtaskTitle.trim(),
                description: newSubtaskDescription.trim() || null
              });
              setNewSubtaskTitle("");
              setNewSubtaskDescription("");
            }
          }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subtaskTitle">Title</Label>
                <Input
                  id="subtaskTitle"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Enter subtask title"
                  disabled={isLoadingSubtask}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtaskDescription">Description</Label>
                <Textarea
                  id="subtaskDescription"
                  value={newSubtaskDescription}
                  onChange={(e) => setNewSubtaskDescription(e.target.value)}
                  placeholder="Enter subtask description (optional)"
                  disabled={isLoadingSubtask}
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onStateChange({ isSubtaskDialogOpen: false })}
                disabled={isLoadingSubtask}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newSubtaskTitle.trim() || isLoadingSubtask}
              >
                {isLoadingSubtask ? "Creating..." : "Create Subtask"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={state.isDetailsDialogOpen}
        onOpenChange={(open) =>
          onStateChange({ isDetailsDialogOpen: open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <p className="text-sm text-muted-foreground">{task.title}</p>
            </div>
            {task.description && (
              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}
            <div>
              <Label>Priority</Label>
              <p className="text-sm text-muted-foreground">{task.priority}</p>
            </div>
            {task.dueDate && (
              <div>
                <Label>Due Date</Label>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(task.dueDate), "PPP")}
                  {task.dueTime && format(new Date(`2000/01/01 ${task.dueTime}`), " p")}
                </p>
              </div>
            )}
            <div>
              <Label>Status</Label>
              <p className="text-sm text-muted-foreground">
                {task.completed ? "Completed" : "In Progress"}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskDependenciesModal
        task={task}
        isOpen={state.showDependencies}
        onClose={() => onStateChange({ showDependencies: false })}
        allTasks={allTasks}
        onDependenciesChange={onDependenciesChange}
      />
    </>
  );
} 
