"use client";

import { useEffect, useState } from "react";
import { getTasks, createTask, updateTask, deleteTask } from "../actions/tasks";
import { createList, getLists } from "../actions/lists";
import { TaskData, ListData } from "@/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItem,  } from "@/components/TaskItem";
import {
  BarChart2,
  CheckCircle2,
  Clock,
  ListTodo,
  Star,
  Target,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/TaskDialog";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [lists, setLists] = useState<ListData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showAIChat, setShowAIChat] = useState(true);
  const [defaultList, setDefaultList] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [tasksData, listsData] = await Promise.all([getTasks(), getLists()]);
      setTasks(tasksData);
      setLists(listsData);
    };
    loadData();
  }, []);

  const handleCreateTask = async (taskData: {
    title: string;
    description?: string;
    listId: string;
    isAllDay?: boolean;
    date?: string;
    time?: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
  }) => {
    try {
      const task = await createTask(taskData.listId, {
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.date ? new Date(taskData.date) : null,
        dueTime: taskData.time || null,
        priority: taskData.priority,
      });
      setTasks((prev) => [...prev, task]);
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleUpdateTask = async (taskId: string, data: Partial<TaskData>) => {
    try {
      const { subtasks, ...updateData } = data;
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;

      const updatedTask = await updateTask(taskId, {
        ...updateData,
        listId: updateData.listId || taskToUpdate.listId,
      });
      
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleCreateList = async (name: string) => {
    try {
      const newList = await createList(name);
      setLists(prev => [...prev, newList]);
      return newList;
    } catch (error) {
      console.error("Error creating list:", error);
      throw error;
    }
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const starredTasks = tasks.filter((t) => t.starred);
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

  const priorityBreakdown = tasks.reduce(
    (acc, task) => {
      acc[task.priority]++;
      return acc;
    },
    { Low: 0, Medium: 0, High: 0, Urgent: 0 }
  );

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your tasks
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <TaskDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onCreateTask={handleCreateTask}
        onCreateList={handleCreateList}
        lists={lists}
      />

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeTasks.length}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((activeTasks.length / totalTasks) * 100)}% of total tasks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
                <p className="text-xs text-muted-foreground">
                  {completedTasks.length} tasks completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Starred Tasks</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{starredTasks.length}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((starredTasks.length / totalTasks) * 100)}% of total tasks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Priority Tasks</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {priorityBreakdown.High + priorityBreakdown.Urgent}
                </div>
                <p className="text-xs text-muted-foreground">
                  High or Urgent priority
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt || 0).getTime() -
                        new Date(a.createdAt || 0).getTime()
                    )
                    .slice(0, 5)
                    .map((task) => (
                      <TaskItem
                        key={task.id}
                        task={{
                          id: task.id,
                          title: task.title,
                          description: task.description,
                          completed: task.completed,
                          starred: task.starred,
                          priority: task.priority,
                          dueDate: task.dueDate || null,
                          dueTime: task.dueTime || null,
                          subtasks: task.subtasks.map(st => ({
                            id: st.id,
                            taskId: st.taskId,
                            title: st.title,
                            description: st.description,
                            completed: st.completed,
                            dueDate: st.dueDate || null,
                            dueTime: st.dueTime || null,
                            createdAt: st.createdAt,
                            updatedAt: st.updatedAt,
                          })),
                          listId: task.listId,
                          userId: task.userId,
                          createdAt: task.createdAt,
                          updatedAt: task.updatedAt
                        }}
                        onUpdate={async (id, data) => {
                          const taskToUpdate = tasks.find(t => t.id === id);
                          if (!taskToUpdate) return;

                          // Optimistically update the UI
                          setTasks(prev => prev.map(t => {
                            if (t.id === id) {
                              return {
                                ...t,
                                completed: data.completed ?? t.completed,
                                title: data.title ?? t.title,
                                description: data.description ?? t.description,
                                priority: data.priority ?? t.priority,
                                dueDate: data.dueDate ?? t.dueDate,
                                dueTime: data.dueTime ?? t.dueTime,
                                listId: data.listId ?? t.listId,
                              };
                            }
                            return t;
                          }));

                          // Then update the server
                          await handleUpdateTask(id, {
                            completed: data.completed,
                            title: data.title,
                            description: data.description ?? null,
                            priority: data.priority,
                            dueDate: data.dueDate ?? null,
                            dueTime: data.dueTime ?? null,
                            listId: taskToUpdate.listId, // Always use the current listId
                          });
                        }}
                        onDelete={handleDeleteTask}
                        lists={lists}
                        onCreateList={handleCreateList}
                      />
                    ))}
                  {tasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No tasks yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(priorityBreakdown)
                    .sort(([a], [b]) => {
                      const order = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
                      return order[a as keyof typeof order] - order[b as keyof typeof order];
                    })
                    .map(([priority, count]) => (
                      <div key={priority} className="flex items-center">
                        <div className="w-24 text-sm">{priority}</div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-secondary">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                priority === "Urgent" && "bg-red-500",
                                priority === "High" && "bg-orange-500",
                                priority === "Medium" && "bg-yellow-500",
                                priority === "Low" && "bg-green-500"
                              )}
                              style={{
                                width: `${(count / totalTasks) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-right text-sm">{count}</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
