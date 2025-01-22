"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { TaskItem, type Task } from "@/components/TaskItem";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "@/app/actions/tasks";
import { toast } from "sonner";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const userTasks = await getTasks();
      setTasks(userTasks);
    } catch (error) {
      toast.error("Failed to load tasks");
      console.error("Failed to load tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = async (
    newTaskData: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">,
  ) => {
    try {
      const newTask = await createTask(newTaskData);
      setTasks([...tasks, newTask]);
      setIsAddTaskDialogOpen(false);
      toast.success("Task created successfully");
    } catch (error) {
      toast.error("Failed to create task");
      console.error("Failed to create task:", error);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      const result = await updateTask(updatedTask.id, updatedTask);
      setTasks(tasks.map((t) => (t.id === result.id ? result : t)));
      toast.success("Task updated successfully");
    } catch (error) {
      toast.error("Failed to update task");
      console.error("Failed to update task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
      toast.success("Task deleted successfully");
    } catch (error) {
      toast.error("Failed to delete task");
      console.error("Failed to delete task:", error);
    }
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <Button onClick={() => setIsAddTaskDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Task
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <TaskList
            tasks={tasks}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        </TabsContent>
        <TabsContent value="active">
          <TaskList
            tasks={activeTasks}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        </TabsContent>
        <TabsContent value="completed">
          <TaskList
            tasks={completedTasks}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        </TabsContent>
      </Tabs>

      <AddTaskDialog
        isOpen={isAddTaskDialogOpen}
        onClose={() => setIsAddTaskDialogOpen(false)}
        onAddTask={handleAddTask}
      />
    </div>
  );
}

function TaskList({
  tasks,
  onUpdate,
  onDelete,
}: {
  tasks: Task[];
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
          {tasks.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No tasks available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
