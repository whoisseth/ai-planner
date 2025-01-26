"use client";

import { TaskData } from "@/types/task";
import { TaskItem } from "@/components/TaskItem";
import { updateTask, deleteTask } from "@/app/actions/tasks";
import { toast } from "sonner";
import { useAutoAnimate } from '@formkit/auto-animate/react'

interface TaskListProps {
  tasks: TaskData[];
  onTasksChange?: () => void;
}

export function TaskList({ tasks, onTasksChange }: TaskListProps) {
  const [animationParent] = useAutoAnimate()

  async function handleUpdateTask(taskId: string, taskData: Partial<TaskData>) {
    try {
      await updateTask(taskId, taskData);
      toast.success("Task updated successfully");
      onTasksChange?.();
    } catch (error) {
      toast.error("Failed to update task");
      console.error("Failed to update task:", error);
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted successfully");
      onTasksChange?.();
    } catch (error) {
      toast.error("Failed to delete task");
    }
  }

  return (
    <div ref={animationParent} className="space-y-4">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      ))}
      {tasks.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No tasks available
        </p>
      )}
    </div>
  );
}
