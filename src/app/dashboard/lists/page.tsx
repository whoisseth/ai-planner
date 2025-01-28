// src/app/dashboard/lists/page.tsx

"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { getLists, createList, updateListName, deleteList } from "@/app/actions/lists";
import { getTasks, createTask, updateTask, deleteTask } from "@/app/actions/tasks";
import { ListData, TaskData } from "@/types/task";
import { TaskList } from "@/app/dashboard/components/TaskList";
import { Button } from "@/components/ui/button";
import { PlusCircle, Grid2X2, LayoutList, Star, CheckCircle2, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExtendedTaskData } from "@/components/TaskItem";

export default function ListsPage() {
  const [lists, setLists] = useState<ListData[]>([]);
  const [tasks, setTasks] = useState<ExtendedTaskData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [listsData, tasksData] = await Promise.all([
          getLists(),
          getTasks()
        ]);
        setLists(listsData);
        setTasks(tasksData.map(task => ({ ...task, subtasks: [] })));
      } catch (error) {
        console.error("Failed to load data:", error);
        toast.error("Failed to load lists and tasks");
      }
    };

    loadData();
  }, []);

  const handleCreateList = useCallback(async () => {
    if (newListName.trim()) {
      try {
        const list = await createList(newListName.trim());
        setLists((prev) => [...prev, list]);
        setNewListName("");
        setIsOpen(false);
        toast.success("List created successfully");
      } catch (error) {
        console.error("Failed to create list:", error);
        toast.error("Failed to create list");
      }
    }
  }, [newListName]);

  const handleRenameList = useCallback(async (listId: string, name: string) => {
    try {
      await updateListName(listId, name, lists.find(l => l.id === listId)?.userId || "");
      const updatedLists = await getLists();
      setLists(updatedLists);
      toast.success("List renamed successfully");
    } catch (error) {
      console.error("Failed to rename list:", error);
      toast.error("Failed to rename list");
    }
  }, [lists]);

  const handleDeleteList = useCallback(async (listId: string) => {
    try {
      await deleteList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
      setTasks((prev) => prev.filter((t) => t.listId !== listId));
      toast.success("List deleted successfully");
    } catch (error) {
      console.error("Failed to delete list:", error);
      toast.error("Failed to delete list");
    }
  }, []);

  const handleAddTask = useCallback(async (listId: string) => {
    try {
      const task = await createTask(listId, { title: "New Task" });
      setTasks((prev) => [...prev, { ...task, subtasks: [] }]);
      toast.success("Task added successfully");
    } catch (error) {
      console.error("Failed to add task:", error);
      toast.error("Failed to add task");
    }
  }, []);

  const handleUpdateTask = useCallback(async (taskId: string, data: Partial<ExtendedTaskData>) => {
    try {
      const task = await updateTask(taskId, data);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...task, subtasks: t.subtasks } : t))
      );
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    }
  }, []);

  const handleReorderTask = useCallback(async (taskId: string, newSortOrder: number) => {
    try {
      const task = await updateTask(taskId, { sortOrder: newSortOrder });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...task, subtasks: t.subtasks } : t))
      );
      toast.success("Task reordered successfully");
    } catch (error) {
      console.error("Failed to reorder task:", error);
      toast.error("Failed to reorder task");
    }
  }, []);

  const getListIcon = (list: ListData) => {
    if (list.isStarred) return <Star className="h-4 w-4 text-yellow-500" />;
    if (list.isDone) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    return null;
  };

  const getListBadge = (list: ListData) => {
    if (list.isDefault) return <Badge variant="outline">Default</Badge>;
    if (list.isStarred) return <Badge variant="outline" className="bg-yellow-100">Starred</Badge>;
    if (list.isDone) return <Badge variant="outline" className="bg-green-100">Done</Badge>;
    return null;
  };

  const sortedDefaultLists = useMemo(() => 
    lists
      .filter(list => !list.isDeletable)
      .sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        if (a.isStarred) return -1;
        if (b.isStarred) return 1;
        return 0;
      }),
    [lists]
  );

  const sortedCustomLists = useMemo(() =>
    lists
      .filter(list => list.isDeletable)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [lists]
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Lists</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-lg border bg-card p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "px-2",
                viewMode === "grid" && "bg-accent text-accent-foreground"
              )}
              onClick={() => setViewMode("grid")}
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "px-2",
                viewMode === "list" && "bg-accent text-accent-foreground"
              )}
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
          {!lists.some(list => !list.isDeletable) && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New List
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create new list</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="List name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleCreateList}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-6"
        )}
      >
        {sortedDefaultLists.map((list) => (
          <div key={list.id} className="card p-4 border-2 border-primary/10">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                {getListIcon(list)}
                <h2 className="text-lg font-medium">{list.name}</h2>
                {getListBadge(list)}
              </div>
              <Button onClick={() => handleAddTask(list.id)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
            <TaskList 
              tasks={tasks.filter((task) => task.listId === list.id)}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
              lists={lists}
              onReorder={handleReorderTask}
            />
          </div>
        ))}

        {sortedCustomLists.map((list) => (
          <div key={list.id} className="card p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium">{list.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => handleAddTask(list.id)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
                {list.isDeletable && (
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => handleDeleteList(list.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <TaskList 
              tasks={tasks.filter((task) => task.listId === list.id)}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
              lists={lists}
              onReorder={handleReorderTask}
            />
          </div>
        ))}
      </div>
    </div>
  );
}