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
import Link from "next/link";

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
    <div className="h-full flex-1 flex-col md:flex bg-background relative">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-3 h-14 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-foreground/90">Dashboard</h2>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link 
                href="/tasks/active"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors group"
                title="View all active tasks"
              >
                <ListTodo className="h-3.5 w-3.5 group-hover:text-primary" />
                <span>{activeTasks.length} active</span>
              </Link>
              <Link 
                href="/tasks/completed"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors group"
                title="View completed tasks"
              >
                <CheckCircle2 className="h-3.5 w-3.5 group-hover:text-primary" />
                <span>{Math.round(completionRate)}% done</span>
              </Link>
              <Link 
                href="/tasks/starred"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors group"
                title="View starred tasks"
              >
                <Star className="h-3.5 w-3.5 group-hover:text-primary" />
                <span>{starredTasks.length} starred</span>
              </Link>
              <Link 
                href="/tasks/priority"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors group"
                title="View high priority tasks"
              >
                <Target className="h-3.5 w-3.5 group-hover:text-primary" />
                <span>{priorityBreakdown.High + priorityBreakdown.Urgent} urgent</span>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsOpen(true)}
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs hover:bg-primary hover:text-primary-foreground"
              title="Create a new task"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      <TaskDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onCreateTask={handleCreateTask}
        onCreateList={handleCreateList}
        lists={lists}
      />

      <div className="p-2">
        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-card">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-xs font-medium text-card-foreground/90">Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
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

                        await handleUpdateTask(id, {
                          completed: data.completed,
                          title: data.title,
                          description: data.description ?? null,
                          priority: data.priority,
                          dueDate: data.dueDate ?? null,
                          dueTime: data.dueTime ?? null,
                          listId: taskToUpdate.listId,
                        });
                      }}
                      onDelete={handleDeleteTask}
                      lists={lists}
                      onCreateList={handleCreateList}
                    />
                  ))}
                {tasks.length === 0 && (
                  <div className="flex items-center justify-center py-2">
                    <p className="text-[10px] text-muted-foreground">No tasks</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-xs font-medium text-card-foreground/90">Priority</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1.5">
                {Object.entries(priorityBreakdown)
                  .sort(([a], [b]) => {
                    const order = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
                    return order[a as keyof typeof order] - order[b as keyof typeof order];
                  })
                  .map(([priority, count]) => (
                    <div key={priority} className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full"
                        style={{
                          backgroundColor: priority === "Urgent" ? "rgb(239 68 68)" :
                            priority === "High" ? "rgb(249 115 22)" :
                            priority === "Medium" ? "rgb(234 179 8)" :
                            "rgb(34 197 94)"
                        }}
                      />
                      <span className="text-[10px] font-medium text-card-foreground/90 min-w-[40px]">{priority}</span>
                      <div className="flex-1 h-1 rounded-full bg-secondary/30">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
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
                      <span className="text-[10px] text-card-foreground/70 w-3 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
