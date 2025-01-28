"use client";

import { TaskData } from "@/types/task";
import { TaskItem } from "@/components/TaskItem";
import { updateTask, deleteTask } from "@/app/actions/tasks";
import { toast } from "sonner";
import { useAutoAnimate } from '@formkit/auto-animate/react'

interface TaskListProps {
  tasks: TaskData[];
  onTasksChange?: () => void;
  onUpdate?: (taskId: string, taskData: Partial<TaskData>) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  lists?: { id: string; name: string }[];
  onCreateList?: (name: string) => Promise<{ id: string; name: string }>;
}

export function TaskList({ 
  tasks, 
  onTasksChange,
  onUpdate,
  onDelete,
  lists = [],
  onCreateList,
}: TaskListProps) {
  const [animationParent] = useAutoAnimate();

  const handleUpdateTask = async (taskId: string, taskData: Partial<TaskData>) => {
    try {
      await updateTask(taskId, taskData);
      toast.success("Task updated successfully");
      onTasksChange?.();
    } catch (error) {
      toast.error("Failed to update task");
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted successfully");
      onTasksChange?.();
    } catch (error) {
      toast.error("Failed to delete task");
      console.error("Error deleting task:", error);
    }
  };

  return (
    <div className="space-y-2" ref={animationParent}>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onUpdate={onUpdate || handleUpdateTask}
          onDelete={onDelete || handleDeleteTask}
          lists={lists}
          onCreateList={onCreateList}
          allTasks={tasks}
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
