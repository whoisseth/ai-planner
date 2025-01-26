"use client";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTaskDialog as AddTaskDialogComponent } from "@/components/AddTaskDialog";
import { createTask } from "@/app/actions/tasks";
import { useState } from "react";
import { toast } from "sonner";

interface AddTaskDialogProps {
  onCreateTask: (taskData: {
    title: string;
    description?: string;
    listId: string;
    isAllDay?: boolean;
    date?: string;
    time?: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
  }) => Promise<void>;
  onCreateList: (name: string) => Promise<{ id: string; name: string }>;
  lists: { id: string; name: string }[];
}

export function AddTaskDialog({ onCreateTask, onCreateList, lists }: AddTaskDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <PlusCircle className="h-4 w-4 mr-2" />
        New Task
      </Button>

      <AddTaskDialogComponent
        open={isOpen}
        onOpenChange={setIsOpen}
        onCreateTask={onCreateTask}
        onCreateList={onCreateList}
        lists={lists}
      />
    </>
  );
}
