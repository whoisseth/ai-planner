"use client";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTaskDialog as AddTaskDialogComponent } from "@/components/AddTaskDialog";
import { createTask } from "@/app/actions/tasks";
import { useState } from "react";

export function AddTaskButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Task
      </Button>

      <AddTaskDialogComponent
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAddTask={async (taskData) => {
          try {
            await createTask({
              ...taskData,
              dueDate: taskData.dueDate ?? null,
              dueTime: taskData.dueTime ?? null,
            });
          } catch (error) {
            console.error("Failed to create task:", error);
          }
        }}
      />
    </>
  );
}
