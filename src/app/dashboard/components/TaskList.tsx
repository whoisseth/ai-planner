"use client";

import { TaskItem, type Task } from "@/components/TaskItem";
import { updateTask, deleteTask } from "@/app/actions/tasks";
import { toast } from "sonner";

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  async function handleUpdateTask(taskData: Task) {
    try {
      await updateTask(taskData.id, taskData);
      toast.success("Task updated successfully");
      // Force a refresh of the tasks list
    } catch (error) {
      toast.error("Failed to update task");
      console.error("Failed to update task:", error);
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted successfully");
    } catch (error) {
      toast.error("Failed to delete task");
    }
  }

  return (
    <div className="space-y-4">
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
