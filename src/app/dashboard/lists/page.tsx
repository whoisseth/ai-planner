"use client";

import { useCallback, useEffect, useState } from "react";
import { getLists, createList, renameList, deleteList } from "../../actions/lists";
import { getTasks, createTask, updateTask, deleteTask } from "../../actions/tasks";
import { ListData, TaskData } from "@/types/task";
import { TaskList } from "@/app/dashboard/components/TaskList";
import { Button } from "@/components/ui/button";
import { PlusCircle, Grid2X2, LayoutList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function ListsPage() {
  const [lists, setLists] = useState<ListData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
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
        setTasks(tasksData);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    loadData();
  }, []);

  const handleCreateList = useCallback(async () => {
    if (newListName.trim()) {
      const list = await createList(newListName.trim());
      setLists((prev) => [...prev, list]);
      setNewListName("");
      setIsOpen(false);
    }
  }, [newListName]);

  const handleRenameList = useCallback(async (listId: string, name: string) => {
    const list = await renameList(listId, name);
    setLists((prev) =>
      prev.map((l) => (l.id === list.id ? list : l))
    );
  }, []);

  const handleDeleteList = useCallback(async (listId: string) => {
    await deleteList(listId);
    setLists((prev) => prev.filter((l) => l.id !== listId));
    setTasks((prev) => prev.filter((t) => t.listId !== listId));
  }, []);

  const handleAddTask = useCallback(async (listId: string) => {
    const task = await createTask(listId, { title: "New Task" });
    setTasks((prev) => [...prev, task]);
  }, []);

  const handleUpdateTask = useCallback(async (taskId: string, data: Partial<TaskData>) => {
    const task = await updateTask(taskId, data);
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? task : t))
    );
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

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
        </div>
      </div>

      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-6"
        )}
      >
        {lists.map((list) => (
          <div key={list.id} className="card p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">{list.name}</h2>
              <Button onClick={() => handleAddTask(list.id)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
            <TaskList tasks={tasks.filter((task) => task.listId === list.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}