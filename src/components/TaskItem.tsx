"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, Trash, Edit, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from "@/app/actions/tasks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOptimistic, startTransition } from "react";

export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type SubTask = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  taskId: string;
};

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate: Date | null;
  dueTime: string | null;
  userId: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  subtasks: SubTask[];
};

interface TaskItemProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({
  task: initialTask,
  onUpdate,
  onDelete,
}: TaskItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editedTask, setEditedTask] = useState(initialTask);
  const [newSubtask, setNewSubtask] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editedSubtaskTitle, setEditedSubtaskTitle] = useState("");

  const [optimisticTask, addOptimisticTask] = useOptimistic(
    initialTask,
    (state: Task, optimisticUpdate: { type: string; data: any }) => {
      switch (optimisticUpdate.type) {
        case "update":
          return { ...state, ...optimisticUpdate.data };
        case "addSubtask":
          return {
            ...state,
            subtasks: [...state.subtasks, optimisticUpdate.data],
          };
        case "updateSubtask":
          return {
            ...state,
            subtasks: state.subtasks.map((subtask) =>
              subtask.id === optimisticUpdate.data.id
                ? { ...subtask, ...optimisticUpdate.data }
                : subtask,
            ),
          };
        case "deleteSubtask":
          return {
            ...state,
            subtasks: state.subtasks.filter(
              (subtask) => subtask.id !== optimisticUpdate.data,
            ),
          };
        default:
          return state;
      }
    },
  );

  const handleStatusChange = () => {
    const updatedTask = {
      ...optimisticTask,
      completed: !optimisticTask.completed,
      updatedAt: new Date(),
    };
    startTransition(() => {
      onUpdate(updatedTask);
    });
  };

  const handleSaveEdit = async () => {
    try {
      const updatedTask = {
        ...editedTask,
        dueDate: editedTask.dueDate || null,
        dueTime: editedTask.dueTime || null,
        updatedAt: new Date(),
      };
      startTransition(() => {
        onUpdate(updatedTask);
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      toast.error("Failed to update task");
      console.error("Failed to update task:", error);
    }
  };

  const handleAddSubtask = async () => {
    if (newSubtask.trim()) {
      try {
        const subtaskData = {
          title: newSubtask,
          completed: false,
        };

        // Create an optimistic subtask
        const optimisticSubtask: SubTask = {
          id: `temp-${Date.now()}`,
          title: newSubtask,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: optimisticTask.id,
        };

        // Update the UI optimistically within a transition
        startTransition(() => {
          addOptimisticTask({ type: "addSubtask", data: optimisticSubtask });
        });

        // Make the actual API call
        await createSubtask(optimisticTask.id, subtaskData);
        setNewSubtask("");
        setIsSubtaskDialogOpen(false);
        toast.success("Subtask added successfully");
      } catch (error) {
        toast.error("Failed to add subtask");
        console.error("Failed to add subtask:", error);
      }
    }
  };

  const handleSubtaskStatusChange = async (subtaskId: string) => {
    try {
      const subtask = optimisticTask.subtasks.find((st) => st.id === subtaskId);
      if (subtask) {
        // Create an optimistic update
        const optimisticUpdate = {
          ...subtask,
          completed: !subtask.completed,
          updatedAt: new Date(),
        };

        // Update the UI optimistically within a transition
        startTransition(() => {
          addOptimisticTask({ type: "updateSubtask", data: optimisticUpdate });
        });

        // Make the actual API call
        await updateSubtask(optimisticTask.id, subtaskId, {
          completed: !subtask.completed,
        });
        toast.success("Subtask updated successfully");
      }
    } catch (error) {
      toast.error("Failed to update subtask");
      console.error("Failed to update subtask:", error);
    }
  };

  const handleEditSubtask = (subtaskId: string) => {
    const subtask = optimisticTask.subtasks.find((st) => st.id === subtaskId);
    if (subtask) {
      setEditingSubtaskId(subtaskId);
      setEditedSubtaskTitle(subtask.title);
    }
  };

  const handleSaveSubtaskEdit = async () => {
    if (editingSubtaskId && editedSubtaskTitle.trim()) {
      try {
        // Create an optimistic update
        const optimisticUpdate = {
          id: editingSubtaskId,
          title: editedSubtaskTitle,
          updatedAt: new Date(),
        };

        // Update the UI optimistically within a transition
        startTransition(() => {
          addOptimisticTask({ type: "updateSubtask", data: optimisticUpdate });
        });

        // Make the actual API call
        await updateSubtask(optimisticTask.id, editingSubtaskId, {
          title: editedSubtaskTitle,
        });
        setEditingSubtaskId(null);
        setEditedSubtaskTitle("");
        toast.success("Subtask updated successfully");
      } catch (error) {
        toast.error("Failed to update subtask");
        console.error("Failed to update subtask:", error);
      }
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      // Update the UI optimistically within a transition
      startTransition(() => {
        addOptimisticTask({ type: "deleteSubtask", data: subtaskId });
      });

      // Make the actual API call
      await deleteSubtask(optimisticTask.id, subtaskId);
      toast.success("Subtask deleted successfully");
    } catch (error) {
      toast.error("Failed to delete subtask");
      console.error("Failed to delete subtask:", error);
    }
  };

  return (
    <div className="group relative flex items-start gap-3 border-b px-1 py-2 last:border-b-0 hover:bg-accent/5">
      <TooltipProvider delayDuration={50}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center justify-center pt-0.5">
              <Checkbox
                checked={optimisticTask.completed}
                onCheckedChange={handleStatusChange}
                id={`task-${optimisticTask.id}`}
                className={cn(
                  "h-[18px] w-[18px] cursor-pointer rounded-full border-2 transition-colors",
                  optimisticTask.completed
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/20 hover:border-primary/50 group-hover:border-primary/50",
                  "",
                )}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs font-medium">
            Mark {optimisticTask.completed ? "incomplete" : "completed"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={`task-${optimisticTask.id}`}
            className={cn(
              "cursor-pointer truncate text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              optimisticTask.completed &&
                "text-muted-foreground/50 line-through",
            )}
          >
            {optimisticTask.title}
          </label>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                {
                  "bg-red-100/90 text-red-700 dark:bg-red-900/40 dark:text-red-300":
                    optimisticTask.priority === "Urgent",
                  "bg-yellow-100/90 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300":
                    optimisticTask.priority === "High",
                  "bg-blue-100/90 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300":
                    optimisticTask.priority === "Medium",
                  "bg-gray-100/90 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300":
                    optimisticTask.priority === "Low",
                },
              )}
            >
              {optimisticTask.priority}
            </span>
            {(optimisticTask.dueDate || optimisticTask.dueTime) && (
              <span className="flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground/80">
                <svg
                  className="h-2.5 w-2.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                  {optimisticTask.dueDate &&
                    format(optimisticTask.dueDate, "d MMM,")}
                  {optimisticTask.dueTime &&
                    format(
                      new Date(`2000/01/01 ${optimisticTask.dueTime}`),
                      " h:mm a",
                    )}
                </span>
              </span>
            )}
          </div>
        </div>
        {optimisticTask.subtasks.length > 0 && (
          <div className="ml-0.5 mt-2 space-y-1.5">
            {optimisticTask.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="group/subtask flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-accent/30"
              >
                <TooltipProvider delayDuration={50}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex items-center justify-center">
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={() =>
                            handleSubtaskStatusChange(subtask.id)
                          }
                          className={cn(
                            "h-[14px] w-[14px] cursor-pointer rounded-full border transition-colors",
                            subtask.completed
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/20 hover:border-primary/50 group-hover/subtask:border-primary/50",
                          )}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="text-xs font-medium"
                    >
                      Mark {subtask.completed ? "incomplete" : "completed"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {editingSubtaskId === subtask.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={editedSubtaskTitle}
                      onChange={(e) => setEditedSubtaskTitle(e.target.value)}
                      className="h-7"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveSubtaskEdit();
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleSaveSubtaskEdit}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span
                      className={cn(
                        "flex-1 text-xs",
                        subtask.completed &&
                          "text-muted-foreground/50 line-through",
                      )}
                    >
                      {subtask.title}
                    </span>
                    <div className="flex opacity-0 transition-opacity group-hover/subtask:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditSubtask(subtask.id)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDeleteSubtask(subtask.id)}
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent/50"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuItem
              onClick={() => setIsSubtaskDialogOpen(true)}
              className="px-3 py-2.5 text-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add subtask
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIsEditDialogOpen(true)}
              className="px-3 py-2.5 text-sm"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit task
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIsDetailsDialogOpen(true)}
              className="px-3 py-2.5 text-sm"
            >
              <Info className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="px-3 py-2.5 text-sm text-destructive"
              onClick={() => onDelete(optimisticTask.id)}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Make changes to your task here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editedTask.title}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, title: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={editedTask.priority}
                onValueChange={(value: Priority) =>
                  setEditedTask({ ...editedTask, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={
                  editedTask.dueDate
                    ? format(editedTask.dueDate, "yyyy-MM-dd")
                    : ""
                }
                onChange={(e) =>
                  setEditedTask({
                    ...editedTask,
                    dueDate: e.target.value ? new Date(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueTime">Due Time</Label>
              <Input
                id="dueTime"
                type="time"
                value={editedTask.dueTime || ""}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, dueTime: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubtaskDialogOpen} onOpenChange={setIsSubtaskDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Subtask</DialogTitle>
            <DialogDescription>
              Add a new subtask to "{optimisticTask.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subtask">Subtask Title</Label>
              <Input
                id="subtask"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddSubtask}>Add subtask</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label className="font-bold">Title</Label>
              <p>{optimisticTask.title}</p>
            </div>
            <div>
              <Label className="font-bold">Priority</Label>
              <p>{optimisticTask.priority}</p>
            </div>
            <div>
              <Label className="font-bold">Due Date</Label>
              <p>
                {optimisticTask.dueDate
                  ? format(optimisticTask.dueDate, "MMMM d, yyyy")
                  : "Not set"}
              </p>
            </div>
            <div>
              <Label className="font-bold">Due Time</Label>
              <p>{optimisticTask.dueTime || "Not set"}</p>
            </div>
            <div>
              <Label className="font-bold">Status</Label>
              <p>{optimisticTask.completed ? "Completed" : "Active"}</p>
            </div>
            {optimisticTask.subtasks.length > 0 && (
              <div>
                <Label className="font-bold">Subtasks</Label>
                <ul className="list-disc pl-5">
                  {optimisticTask.subtasks.map((subtask) => (
                    <li
                      key={subtask.id}
                      className={subtask.completed ? "line-through" : ""}
                    >
                      {subtask.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
