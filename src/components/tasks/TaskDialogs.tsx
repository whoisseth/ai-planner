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
import type { ExtendedTaskData } from "@/components/TaskItem";
import { TagInput } from "@/components/TagInput";
import { TaskEditDialog } from "@/components/TaskEditDialog";
import { TaskDependenciesModal } from "@/components/TaskDependenciesModal";

interface TaskDialogsProps {
  task: ExtendedTaskData;
  isEditDialogOpen: boolean;
  isSubtaskDialogOpen: boolean;
  isDetailsDialogOpen: boolean;
  isSubtaskDueDateDialogOpen: boolean;
  showDependencies: boolean;
  selectedSubtaskId: string | null;
  lists: { id: string; name: string }[];
  allTasks: ExtendedTaskData[];
  tags: Array<{ id: string; name: string; color: string }>;
  dependencies: string[];
  onEditDialogClose: () => void;
  onSubtaskDialogClose: () => void;
  onDetailsDialogClose: () => void;
  onSubtaskDueDateDialogClose: () => void;
  onDependenciesClose: () => void;
  onSaveEdit: (taskData: any) => void;
  onAddSubtask: (title: string, description?: string) => void;
  onUpdateSubtaskDueDate: (subtaskId: string, date: Date | null, time: string | null) => void;
  onSubtaskStatusChange: (subtaskId: string) => void;
  onTagsChange: (tagIds: string[]) => void;
  onDependenciesChange: (dependencyIds: string[]) => void;
  onCreateList?: (name: string) => Promise<{ id: string; name: string }>;
}

export function TaskDialogs({
  task,
  isEditDialogOpen,
  isSubtaskDialogOpen,
  isDetailsDialogOpen,
  isSubtaskDueDateDialogOpen,
  showDependencies,
  selectedSubtaskId,
  lists,
  allTasks,
  tags,
  dependencies,
  onEditDialogClose,
  onSubtaskDialogClose,
  onDetailsDialogClose,
  onSubtaskDueDateDialogClose,
  onDependenciesClose,
  onSaveEdit,
  onAddSubtask,
  onUpdateSubtaskDueDate,
  onSubtaskStatusChange,
  onTagsChange,
  onDependenciesChange,
  onCreateList,
}: TaskDialogsProps) {
  const [newSubtask, setNewSubtask] = useState("");
  const [newSubtaskDescription, setNewSubtaskDescription] = useState("");

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      onAddSubtask(newSubtask.trim(), newSubtaskDescription.trim() || undefined);
      setNewSubtask("");
      setNewSubtaskDescription("");
      onSubtaskDialogClose();
    }
  };

  return (
    <>
      <TaskEditDialog
        open={isEditDialogOpen}
        onOpenChange={onEditDialogClose}
        task={task}
        lists={lists}
        onUpdate={onSaveEdit}
        onCreateList={onCreateList}
      />

      <Dialog open={isSubtaskDialogOpen} onOpenChange={onSubtaskDialogClose}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 shadow-lg sm:max-w-[500px]">
          <DialogHeader className="flex flex-row items-center justify-between border-b p-4">
            <DialogTitle className="text-xl font-semibold">Add Subtask</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-6 p-4">
              <div className="grid gap-2">
                <Input
                  id="subtask"
                  placeholder="Enter subtask title"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  className="h-12"
                />
              </div>
              <div className="grid gap-2">
                <Textarea
                  id="subtaskDescription"
                  placeholder="Add description"
                  value={newSubtaskDescription}
                  onChange={(e) => setNewSubtaskDescription(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-auto border-t p-4">
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                onClick={onSubtaskDialogClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSubtask}
                disabled={!newSubtask.trim()}
                className="flex-1"
              >
                Add Subtask
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsDialogOpen} onOpenChange={onDetailsDialogClose}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 shadow-lg sm:max-w-[500px]">
          <DialogHeader className="flex flex-row items-center justify-between border-b p-4">
            <DialogTitle className="text-xl font-semibold">Task Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Title</h3>
                <p className="mt-1 text-sm">{task.title}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="mt-1 text-sm">{task.description || "No description"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Priority</h3>
                <p className="mt-1 text-sm">{task.priority}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Due Date</h3>
                <p className="mt-1 text-sm">
                  {task.dueDate ? format(task.dueDate, "MMMM d, yyyy") : "No due date"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Due Time</h3>
                <p className="mt-1 text-sm">
                  {task.dueTime
                    ? format(new Date(`2000/01/01 ${task.dueTime}`), "h:mm a")
                    : "No due time"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Subtasks</h3>
                <ul className="mt-1 space-y-2">
                  {task.subtasks && task.subtasks.length > 0 ? (
                    task.subtasks.map((subtask: SubTaskData) => (
                      <li key={subtask.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={() => onSubtaskStatusChange(subtask.id)}
                          id={`details-subtask-${subtask.id}`}
                          className="h-4 w-4"
                        />
                        <label
                          htmlFor={`details-subtask-${subtask.id}`}
                          className={cn(
                            "text-sm",
                            subtask.completed && "text-muted-foreground line-through",
                          )}
                        >
                          {subtask.title}
                        </label>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">No subtasks</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
                <div className="mt-1">
                  <TagInput
                    tags={tags}
                    selectedTags={task.tags || []}
                    onTagsChange={onTagsChange}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Dependencies</h3>
                <div className="mt-1">
                  {dependencies.length > 0 ? (
                    <div className="space-y-2">
                      {dependencies.map((depId) => {
                        const depTask = allTasks.find((t) => t.id === depId);
                        return (
                          <div
                            key={depId}
                            className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2"
                          >
                            <span className="text-sm">
                              {depTask?.title || "Unknown Task"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No dependencies</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-auto border-t p-4">
            <Button onClick={onDetailsDialogClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSubtaskDueDateDialogOpen}
        onOpenChange={onSubtaskDueDateDialogClose}
      >
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 shadow-lg sm:max-w-[500px]">
          <DialogHeader className="flex flex-row items-center justify-between border-b p-4">
            <DialogTitle className="text-xl font-semibold">Set Due Date</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-6 p-4">
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="date">Due Date</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      id="date"
                      value={
                        task.subtasks?.find((st: SubTaskData) => st.id === selectedSubtaskId)?.dueDate
                          ?.toISOString()
                          .split("T")[0] || ""
                      }
                      onChange={(e) => {
                        if (selectedSubtaskId) {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          onUpdateSubtaskDueDate(
                            selectedSubtaskId,
                            date,
                            task.subtasks?.find((st: SubTaskData) => st.id === selectedSubtaskId)
                              ?.dueTime || null,
                          );
                        }
                      }}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="time">Due Time</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      id="time"
                      value={
                        task.subtasks?.find((st: SubTaskData) => st.id === selectedSubtaskId)?.dueTime ||
                        ""
                      }
                      onChange={(e) => {
                        if (selectedSubtaskId) {
                          onUpdateSubtaskDueDate(
                            selectedSubtaskId,
                            task.subtasks?.find((st: SubTaskData) => st.id === selectedSubtaskId)
                              ?.dueDate || null,
                            e.target.value || null,
                          );
                        }
                      }}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-auto border-t p-4">
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                onClick={onSubtaskDueDateDialogClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={onSubtaskDueDateDialogClose} className="flex-1">
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDependenciesModal
        task={task}
        isOpen={showDependencies}
        onClose={onDependenciesClose}
        allTasks={allTasks}
        onDependenciesChange={onDependenciesChange}
      />
    </>
  );
} 
