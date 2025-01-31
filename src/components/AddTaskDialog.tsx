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
import { Task } from "./TaskItem";
import { toast } from "sonner";

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<Task, "id" | "subtasks">) => void;
}

export function AddTaskDialog({
  isOpen,
  onClose,
  onAddTask,
}: AddTaskDialogProps) {
  const [newTask, setNewTask] = useState<
    Omit<Task, "id" | "completed" | "subtasks">
  >({
    title: "",
    priority: "Medium",
    dueDate: undefined,
    dueTime: undefined,
  });

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      onAddTask({
        ...newTask,
        completed: false,
      });
      setNewTask({
        title: "",
        priority: "Medium",
        dueDate: undefined,
        dueTime: undefined,
      });
      toast.success("Task added successfully");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task for your list.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTask();
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={newTask.priority}
              onValueChange={(value: Task["priority"]) =>
                setNewTask({ ...newTask, priority: value })
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
              onChange={(e) =>
                setNewTask({
                  ...newTask,
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
              onChange={(e) =>
                setNewTask({ ...newTask, dueTime: e.target.value })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAddTask}>Add task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
