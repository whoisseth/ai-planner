"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTodo, CheckCircle2, Star, Calendar } from "lucide-react";
import type { TaskData } from "@/types/task";

interface DashboardStatsProps {
  tasks: TaskData[];
}

export function DashboardStats({ tasks }: DashboardStatsProps) {
  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const starredTasks = tasks.filter((t) => t.starred);
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

  const tasksToday = tasks.filter(t => {
    const today = new Date();
    const dueDate = t.dueDate ? new Date(t.dueDate) : null;
    return dueDate && 
      dueDate.getDate() === today.getDate() &&
      dueDate.getMonth() === today.getMonth() &&
      dueDate.getFullYear() === today.getFullYear();
  }).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeTasks.length}</div>
          <p className="text-xs text-muted-foreground">
            {activeTasks.length === 1 ? "task" : "tasks"} pending
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
          <p className="text-xs text-muted-foreground">
            {completedTasks.length} completed tasks
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Starred Tasks</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{starredTasks.length}</div>
          <p className="text-xs text-muted-foreground">
            {starredTasks.length === 1 ? "priority task" : "priority tasks"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Due Today</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tasksToday}</div>
          <p className="text-xs text-muted-foreground">tasks due today</p>
        </CardContent>
      </Card>
    </div>
  );
} 