"use client";

import { TaskItem, type Task } from "@/components/TaskItem";
import { updateTask, deleteTask } from "@/app/actions/tasks";
import { toast } from "sonner";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useOptimistic, startTransition } from "react";

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks: initialTasks }: TaskListProps) {
  const [animationParent] = useAutoAnimate();
  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    initialTasks,
    (state: Task[], optimisticUpdate: { type: string; data: any }) => {
      switch (optimisticUpdate.type) {
        case "update":
          return state.map((task) =>
            task.id === optimisticUpdate.data.id
              ? { ...task, ...optimisticUpdate.data }
              : task,
          );
        case "delete":
          return state.filter((task) => task.id !== optimisticUpdate.data);
        default:
          return state;
      }
    },
  );

  async function handleUpdateTask(taskData: Task) {
    try {
      // Create an optimistic update with current timestamp
      const optimisticUpdate = {
        ...taskData,
        updatedAt: new Date(),
      };

      // Update the UI optimistically within a transition
      startTransition(() => {
        addOptimisticTask({ type: "update", data: optimisticUpdate });
      });

      // Make the actual API call
      await updateTask(taskData.id, taskData);
      toast.success("Task updated successfully");
    } catch (error) {
      // If the API call fails, the optimistic state will be automatically reverted
      toast.error("Failed to update task");
      console.error("Failed to update task:", error);
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      // Update the UI optimistically within a transition
      startTransition(() => {
        addOptimisticTask({ type: "delete", data: taskId });
      });

      // Make the actual API call
      await deleteTask(taskId);
      toast.success("Task deleted successfully");
    } catch (error) {
      // If the API call fails, the optimistic state will be automatically reverted
      toast.error("Failed to delete task");
      console.error("Failed to delete task:", error);
    }
  }

  return (
    <div ref={animationParent} className="space-y-4">
      {optimisticTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      ))}
      {optimisticTasks.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No tasks available
        </p>
      )}
    </div>
  );
}
