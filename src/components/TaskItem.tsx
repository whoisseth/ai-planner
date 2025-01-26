"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { TaskEditDialog } from "./TaskEditDialog";
import type { TaskData } from "@/types/task";
import { SubtaskEditDialog } from "./SubtaskEditDialog";

export type Priority = "Low" | "Medium" | "High" | "Urgent";

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface TaskItemProps {
  task: TaskData;
  onUpdate: (taskId: string, data: Partial<TaskData>) => void;
  onDelete: (taskId: string) => void;
  lists?: { id: string; name: string }[];
  onCreateList?: (name: string) => Promise<{ id: string; name: string }>;
}

export function TaskItem({ task, onUpdate, onDelete, lists = [], onCreateList }: TaskItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [newSubtask, setNewSubtask] = useState("");
  const [newSubtaskDescription, setNewSubtaskDescription] = useState("");
  const [editingSubtask, setEditingSubtask] = useState<SubTask | null>(null);

  const handleStatusChange = () => {
    onUpdate(task.id, {
      completed: !task.completed,
      description: task.description,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      listId: task.listId,
    });
  };

  const handleSaveEdit = async (taskData: {
    title: string;
    description?: string;
    listId: string;
    isAllDay?: boolean;
    date?: string;
    time?: string;
    priority?: Priority;
  }) => {
    try {
      await onUpdate(task.id, {
        title: taskData.title,
        description: taskData.description,
        listId: taskData.listId,
        dueDate: taskData.date ? new Date(taskData.date) : null,
        dueTime: taskData.time || null,
        priority: taskData.priority,
      });
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
        const description = newSubtaskDescription.trim();
        const subtask = await createSubtask(task.id, newSubtask.trim(), description || undefined);
        onUpdate(task.id, {
          subtasks: [...task.subtasks, { 
            ...subtask, 
            completed: false,
            description: description || null 
          }],
        });
        setNewSubtask("");
        setNewSubtaskDescription("");
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
        await updateSubtask(subtaskId, {
          completed: !subtask.completed,
          description: subtask.description,
        });
        onUpdate(task.id, {
          description: task.description,
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          listId: task.listId,
          completed: task.completed,
          subtasks: task.subtasks.map((st) =>
            st.id === subtaskId
              ? { ...st, completed: !st.completed }
              : st
          ),
        });
      }
    } catch (error) {
      toast.error("Failed to update subtask");
      console.error("Failed to update subtask:", error);
    }
  };

  const handleUpdateSubtask = async (subtaskId: string, data: { title: string; description: string | null }) => {
    try {
      await updateSubtask(subtaskId, {
        ...data,
      });
      onUpdate(task.id, {
        subtasks: task.subtasks.map((st) =>
          st.id === subtaskId
            ? { ...st, ...data }
            : st
        ),
      });
      toast.success("Subtask updated successfully");
    } catch (error) {
      toast.error("Failed to update subtask");
      console.error("Failed to update subtask:", error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await deleteSubtask(subtaskId);
      onUpdate(task.id, {
        subtasks: task.subtasks.filter((st) => st.id !== subtaskId),
      });
      toast.success("Subtask deleted successfully");
    } catch (error) {
      toast.error("Failed to delete subtask");
      console.error("Failed to delete subtask:", error);
    }
  };

  return (
    <div className="group relative flex items-start gap-3 border-b border-border/40 py-3 last:border-b-0 hover:bg-accent/5 px-2 sm:px-3 transition-colors">
      <TooltipProvider delayDuration={50}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center justify-center pt-0.5">
              <Checkbox
                checked={task.completed}
                onCheckedChange={handleStatusChange}
                id={`task-${task.id}`}
                className={cn(
                  "h-5 w-5 sm:h-[18px] sm:w-[18px] rounded-full border-2 transition-all duration-200 cursor-pointer",
                  task.completed ? "bg-primary border-primary scale-105" : "border-muted-foreground/20 hover:border-primary/50 group-hover:border-primary/50"
                )}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs font-medium">
            Mark {task.completed ? 'incomplete' : 'completed'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`task-${task.id}`}
              className={cn(
                "text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 break-words cursor-pointer transition-colors duration-200",
                task.completed && "text-muted-foreground/50 line-through"
              )}
              onDoubleClick={() => setIsEditDialogOpen(true)}
            >
              {task.title}
            </label>
            <div className="flex items-center gap-1.5">
              <span
                className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors", {
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
                  <Calendar className="h-2.5 w-2.5" />
                  <span>
                    {task.dueDate && format(task.dueDate, "MMM d")}
                    {task.dueTime && format(new Date(`2000/01/01 ${task.dueTime}`), " h:mm a")}
                  </span>
                </span>
              )}
            </div>
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
          {task.subtasks.length > 0 && (
            <div className="mt-2 space-y-2">
              {task.subtasks.map((subtask) => (
                <div key={subtask.id} className="group flex items-start gap-3 pl-2">
                  <Checkbox
                    checked={subtask.completed}
                    onCheckedChange={() => handleSubtaskStatusChange(subtask.id)}
                    id={`subtask-${subtask.id}`}
                    className={cn(
                      "h-4 w-4 rounded-full border-2 transition-all duration-200 cursor-pointer",
                      subtask.completed ? "bg-primary border-primary" : "border-muted-foreground/20"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={`subtask-${subtask.id}`}
                        className={cn(
                          "text-sm leading-tight cursor-pointer",
                          subtask.completed && "text-muted-foreground/50 line-through"
                        )}
                      >
                        {subtask.title}
                      </label>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setEditingSubtask(subtask)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {subtask.description && (
                      <p className="text-sm text-muted-foreground mt-1">{subtask.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span className="sr-only">Edit task</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            onClick={() => setIsSubtaskDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span className="sr-only">Add subtask</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-red-600/70 hover:text-red-600"
            onClick={() => onDelete(task.id)}
          >
            <Trash className="h-3.5 w-3.5" />
            <span className="sr-only">Delete task</span>
          </Button>
        </div>
      </div>

      <TaskEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={{
          ...task,
          dueDate: task.dueDate || null
        }}
        lists={lists}
        onUpdate={handleSaveEdit}
        onCreateList={onCreateList}
      />

      <Dialog open={isSubtaskDialogOpen} onOpenChange={setIsSubtaskDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 bg-background sm:max-w-[500px] rounded-lg border shadow-lg">
          <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
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
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewSubtaskDescription(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t mt-auto">
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={() => setIsSubtaskDialogOpen(false)}
                className="flex-1 "
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddSubtask} 
                disabled={!newSubtask.trim()}
                className="flex-1 "
              >
                Add Subtask
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingSubtask && (
        <SubtaskEditDialog
          open={!!editingSubtask}
          onOpenChange={(open) => !open && setEditingSubtask(null)}
          subtask={editingSubtask}
          onUpdate={(data) => handleUpdateSubtask(editingSubtask.id, data)}
        />
      )}
    </div>
  );
}
