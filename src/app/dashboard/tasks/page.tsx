"use client";

import { useCallback, useEffect, useState } from "react";
import { getTasks, createTask, updateTask, deleteTask } from "../../actions/tasks";
import { getLists, createList } from "../../actions/lists";
import { TaskData, ListData } from "@/types/task";
import { TaskList } from "@/app/dashboard/components/TaskList";
import { Button } from "@/components/ui/button";
import { PlusCircle, ListFilter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDialog } from "@/components/TaskDialog";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [lists, setLists] = useState<ListData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [sortBy, setSortBy] = useState("date");

  useEffect(() => {
    const loadTasks = async () => {
      const [tasksData, listsData] = await Promise.all([getTasks(), getLists()]);
      setTasks(tasksData);
      setLists(listsData);
      
      // Create a default list if none exists
      if (listsData.length === 0) {
        const defaultList = await createList("Default");
        setLists([defaultList]);
      }
    };
    loadTasks();
  }, []);

  const refreshTasks = useCallback(async () => {
    const tasksData = await getTasks();
    setTasks(tasksData);
  }, []);

  const handleCreateTask = useCallback(async (taskData: { 
    title: string;
    description?: string | null;
    listId: string;
    dueDate?: Date | null;
    dueTime?: string | null;
    priority?: "Low" | "Medium" | "High" | "Urgent";
  }) => {
    try {
      // Ensure we have a valid listId by using the first available list if none specified
      const validListId = taskData.listId || lists[0]?.id;
      if (!validListId) {
        throw new Error("No valid list available to create task");
      }

      const task = await createTask(validListId, {
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate,
        dueTime: taskData.dueTime,
        priority: taskData.priority
      });
      setTasks((prev) => [...prev, task]);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to create task:", error);
      throw error;
    }
  }, [lists]);

  const handleUpdateTask = useCallback(async (taskId: string, data: Partial<TaskData>) => {
    try {
      const task = await updateTask(taskId, data);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? task : t))
      );
      return task;
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    }
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Failed to delete task:", error);
      throw error;
    }
  }, []);

  const handleCreateList = useCallback(async (name: string) => {
    try {
      const list = await createList(name);
      setLists(prev => [...prev, list]);
      return list;
    } catch (error) {
      console.error("Failed to create list:", error);
      throw error;
    }
  }, []);

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const sortTasks = (tasksToSort: TaskData[]) => {
    return [...tasksToSort].sort((a, b) => {
      switch (sortBy) {
        case "priority":
          const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
          return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
        case "title":
          return a.title.localeCompare(b.title);
        case "date":
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <ListFilter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date Created</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Task
          </Button>
          <TaskDialog
            open={isOpen}
            onOpenChange={setIsOpen}
            onCreateTask={handleCreateTask}
            onCreateList={handleCreateList}
            lists={lists}
          />
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <TaskList 
            tasks={sortTasks(activeTasks)} 
            onTasksChange={refreshTasks}
          />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <TaskList 
            tasks={sortTasks(completedTasks)}
            onTasksChange={refreshTasks}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
