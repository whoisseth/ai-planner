"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskData } from "@/types/task";
import { toast } from "sonner";

type Priority = "Low" | "Medium" | "High" | "Urgent";

interface AddTaskDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreateTask: (taskData: {
    title: string;
    description?: string;
    listId: string;
    dueDate?: Date | null;
    dueTime?: string | null;
    priority?: Priority;
  }) => void;
  onCreateList: (name: string) => Promise<{ id: string; name: string }>;
  lists: { id: string; name: string }[];
}

export function AddTaskDialog({
  open,
  onOpenChange,
  onCreateTask,
  onCreateList,
  lists,
}: AddTaskDialogProps) {
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    listId: lists[0]?.id || "",
    priority: "Medium" as Priority,
    date: "",
    time: "",
  });

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      onCreateTask({
        title: newTask.title.trim(),
        description: newTask.description.trim() || undefined,
        listId: newTask.listId,
        priority: newTask.priority,
        dueDate: newTask.date ? new Date(newTask.date) : null,
        dueTime: newTask.time || null,
      });
      
      // Reset form
      setNewTask({
        title: "",
        description: "",
        listId: lists[0]?.id || "",
        priority: "Medium",
        date: "",
        time: "",
      });
      
      toast.success("Task added successfully");
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 bg-background sm:max-w-[500px] rounded-lg border shadow-lg">
        <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
          <DialogTitle className="text-xl font-semibold">Add New Task</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <div className="space-y-6 p-4">
            <div className="grid gap-2">
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                className="h-12"
                placeholder="Task title"
              />
            </div>
            <div className="grid gap-2">
              <Select
                value={newTask.priority}
                onValueChange={(value: TaskData["priority"]) =>
                  setNewTask({ ...newTask, priority: value })
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Medium Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low Priority</SelectItem>
                  <SelectItem value="Medium">Medium Priority</SelectItem>
                  <SelectItem value="High">High Priority</SelectItem>
                  <SelectItem value="Urgent">Urgent Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Input
                id="date"
                type="date"
                value={newTask.date}
                onChange={(e) =>
                  setNewTask({ ...newTask, date: e.target.value })
                }
                className="h-12"
              />
            </div>
            <div className="grid gap-2">
              <Input
                id="time"
                type="time"
                value={newTask.time}
                onChange={(e) =>
                  setNewTask({ ...newTask, time: e.target.value })
                }
                className="h-12"
              />
            </div>
            {lists.length > 0 && (
              <div className="grid gap-2">
                <Select
                  value={newTask.listId}
                  onValueChange={(value: string) =>
                    setNewTask({ ...newTask, listId: value })
                  }
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select List" />
                  </SelectTrigger>
                  <SelectContent>
                    {lists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="p-4 border-t mt-auto">
          <div className="flex gap-2 w-full">
            <Button 
              onClick={() => onOpenChange?.(false)} 
              variant="outline"
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddTask}
              className="flex-1 h-12"
              disabled={!newTask.title.trim() || !newTask.listId}
            >
              Add task
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
