"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Plus,
  Trash,
  Calendar,
  Edit,
  Info,
} from "lucide-react";
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

export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type SubTask = {
  id: string;
  title: string;
  completed: boolean;
};

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate?: Date;
  dueTime?: string;
  subtasks: SubTask[];
};

interface TaskItemProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [newSubtask, setNewSubtask] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editedSubtaskTitle, setEditedSubtaskTitle] = useState("");

  const handleStatusChange = () => {
    console.log("Toggling task:", task.id, "Current status:", task.completed);
    onUpdate({ ...task, completed: !task.completed });
  };

  const handleSaveEdit = async () => {
    try {
      await onUpdate(editedTask);
      setIsEditDialogOpen(false);
      toast.success("Task updated successfully");
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
        await createSubtask(task.id, subtaskData);
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
      const subtask = task.subtasks.find((st) => st.id === subtaskId);
      if (subtask) {
        await updateSubtask(task.id, subtaskId, {
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
    const subtask = task.subtasks.find((st) => st.id === subtaskId);
    if (subtask) {
      setEditingSubtaskId(subtaskId);
      setEditedSubtaskTitle(subtask.title);
    }
  };

  const handleSaveSubtaskEdit = async () => {
    if (editingSubtaskId && editedSubtaskTitle.trim()) {
      try {
        await updateSubtask(task.id, editingSubtaskId, {
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
      await deleteSubtask(task.id, subtaskId);
      toast.success("Subtask deleted successfully");
    } catch (error) {
      toast.error("Failed to delete subtask");
      console.error("Failed to delete subtask:", error);
    }
  };

  return (
    <div className="group relative flex items-start gap-3 border-b py-2 last:border-b-0 hover:bg-accent/5 px-1">
      <TooltipProvider delayDuration={50}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center justify-center pt-0.5">
              <Checkbox
                checked={task.completed}
                onCheckedChange={handleStatusChange}
                id={`task-${task.id}`}
                className={cn(
                  "h-[18px] w-[18px] rounded-full border-2 transition-colors cursor-pointer",
                  task.completed ? "bg-primary border-primary" : "border-muted-foreground/20 hover:border-primary/50 group-hover:border-primary/50"
                )}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs font-medium">
            Mark {task.completed ? 'incomplete' : 'completed'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <label
            htmlFor={`task-${task.id}`}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate cursor-pointer",
              task.completed && "text-muted-foreground/50 line-through",
            )}
          >
            {task.title}
          </label>
          <div className="flex items-center gap-2">
            <span
              className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", {
                "bg-red-100/90 text-red-700 dark:bg-red-900/40 dark:text-red-300":
                  task.priority === "Urgent",
                "bg-yellow-100/90 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300":
                  task.priority === "High",
                "bg-blue-100/90 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300":
                  task.priority === "Medium",
                "bg-gray-100/90 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300":
                  task.priority === "Low",
              })}
            >
              {task.priority}
            </span>
            {(task.dueDate || task.dueTime) && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded-full">
                <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>
                  {task.dueDate && format(task.dueDate, "MMM d")}
                  {task.dueTime && format(new Date(`2000/01/01 ${task.dueTime}`), " h:mm a")}
                </span>
              </span>
            )}
          </div>
        </div>
        {task.subtasks.length > 0 && (
          <div className="ml-0.5 mt-1.5 space-y-1">
            {task.subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2 group/subtask">
                <TooltipProvider delayDuration={50}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex items-center justify-center">
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={() => handleSubtaskStatusChange(subtask.id)}
                          id={`subtask-${subtask.id}`}
                          className={cn(
                            "h-3.5 w-3.5 rounded-full border-[1.5px] transition-colors cursor-pointer",
                            subtask.completed ? "bg-primary/90 border-primary/90" : "border-muted-foreground/20 hover:border-primary/40 group-hover:border-primary/40"
                          )}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs font-medium">
                      Mark {subtask.completed ? 'incomplete' : 'completed'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <label
                  htmlFor={`subtask-${subtask.id}`}
                  className={cn(
                    "flex-grow text-[11px] truncate",
                    subtask.completed && "text-muted-foreground/50 line-through",
                  )}
                >
                  {subtask.title}
                </label>
                <div className="flex opacity-0 group-hover/subtask:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => handleEditSubtask(subtask.id)}
                  >
                    <Edit className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-red-500/70 hover:text-red-600"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                  >
                    <Trash className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
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
            <DropdownMenuItem onClick={() => setIsSubtaskDialogOpen(true)} className="text-sm py-2.5 px-3">
              <Plus className="mr-2 h-4 w-4" />
              Add subtask
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="text-sm py-2.5 px-3">
              <Edit className="mr-2 h-4 w-4" />
              Edit task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsDetailsDialogOpen(true)} className="text-sm py-2.5 px-3">
              <Info className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-destructive text-sm py-2.5 px-3"
              onClick={() => onDelete(task.id)}
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
                    dueDate: e.target.value
                      ? new Date(e.target.value)
                      : undefined,
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
              Add a new subtask to "{task.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subtask">Subtask Title</Label>
              <Input
                id="subtask"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
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
              <p>{task.title}</p>
            </div>
            <div>
              <Label className="font-bold">Priority</Label>
              <p>{task.priority}</p>
            </div>
            <div>
              <Label className="font-bold">Due Date</Label>
              <p>
                {task.dueDate
                  ? format(task.dueDate, "MMMM d, yyyy")
                  : "Not set"}
              </p>
            </div>
            <div>
              <Label className="font-bold">Due Time</Label>
              <p>{task.dueTime || "Not set"}</p>
            </div>
            <div>
              <Label className="font-bold">Status</Label>
              <p>{task.completed ? "Completed" : "Active"}</p>
            </div>
            {task.subtasks.length > 0 && (
              <div>
                <Label className="font-bold">Subtasks</Label>
                <ul className="list-disc pl-5">
                  {task.subtasks.map((subtask) => (
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
      <Dialog
        open={!!editingSubtaskId}
        onOpenChange={() => setEditingSubtaskId(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Subtask</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editSubtask">Subtask Title</Label>
              <Input
                id="editSubtask"
                value={editedSubtaskTitle}
                onChange={(e) => setEditedSubtaskTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSubtaskEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
