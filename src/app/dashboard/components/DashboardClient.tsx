"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddTaskButton } from "@/components/AddTaskDialog";
import { TaskList } from "./TaskList";
import { Task } from "@/components/TaskItem";
import { Target, BarChart2, Clock } from "lucide-react";
import { useOptimistic, startTransition } from "react";
import { createTask } from "@/app/actions/tasks";
import { toast } from "sonner";

interface DashboardClientProps {
  initialTasks: Task[];
}

export function DashboardClient({ initialTasks }: DashboardClientProps) {
  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    initialTasks,
    (state: Task[], optimisticUpdate: { type: string; data: any }) => {
      switch (optimisticUpdate.type) {
        case "create":
          return [...state, optimisticUpdate.data];
        default:
          return state;
      }
    }
  );

  const handleAddTask = async (taskData: Omit<Task, "id" | "subtasks" | "userId" | "createdAt" | "updatedAt">) => {
    try {
      // Create an optimistic task with a temporary ID
      const optimisticTask: Task = {
        ...taskData,
        id: `temp-${Date.now()}`,
        userId: 0, // This will be set by the server
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: [],
      };

      // Update the UI optimistically within a transition
      startTransition(() => {
        addOptimisticTask({ type: "create", data: optimisticTask });
      });

      // Make the actual API call
      await createTask(taskData);
      toast.success("Task added successfully");
    } catch (error) {
      // If the API call fails, the optimistic state will be automatically reverted
      toast.error("Failed to add task");
      console.error("Failed to add task:", error);
    }
  };

  const activeTasks = optimisticTasks.filter((t) => !t.completed);
  const completedTasks = optimisticTasks.filter((t) => t.completed);

  return (
    <div className="space-y-4 pb-16 lg:pb-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Active Tasks</CardTitle>
          <AddTaskButton onAddTask={handleAddTask} />
        </CardHeader>
        <CardContent>
          <TaskList tasks={activeTasks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            Completed Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TaskList tasks={completedTasks} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Productivity Score
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">+2% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Utilized</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5h 23m</div>
            <p className="text-xs text-muted-foreground">Out of 8 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Focus Area</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Project Work</div>
            <p className="text-xs text-muted-foreground">Suggested by AI</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 