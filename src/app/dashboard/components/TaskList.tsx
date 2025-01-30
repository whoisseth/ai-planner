"use client";
import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { TaskItem } from "@/components/TaskItem";
import { TaskDialog } from "@/components/TaskDialog";
import type { TaskData, ListData, SubTaskData } from "@/types/task";
import {
  createTask,
  updateTask,
  deleteTask,
  updateSubtask,
} from "@/app/actions/tasks";
import { createList } from "@/app/actions/lists";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TaskListProps {
  initialTasks?: TaskData[];
  initialLists?: ListData[];
  tasks?: TaskData[];
  lists?: ListData[];
  onTasksChange?: () => Promise<void>;
  showHeader?: boolean;
}

interface TaskWithSubtasks extends TaskData {
  subtasks: SubTaskData[];
}

interface ExtendedTaskData extends TaskWithSubtasks {
  dependencies?: string[];
  tags?: string[];
}

export function TaskList({
  initialTasks = [],
  initialLists = [],
  tasks: propTasks,
  lists: propLists,
  onTasksChange,
  showHeader = true,
}: TaskListProps) {
  console.log("propTasks- ", propTasks);

  const convertToSubTask = (task: TaskData | SubTaskData): SubTaskData => {
    if ("taskId" in task) {
      return task as SubTaskData;
    }
    return {
      id: task.id,
      taskId: task.parentId!,
      title: task.title,
      description: task.description || null,
      completed: task.completed,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      dueTime: task.dueTime || null,
      createdAt: task.createdAt ? new Date(task.createdAt) : null,
      updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
      deletedAt: null,
      isDeleted: task.isDeleted || false,
      sortOrder: task.sortOrder,
    };
  };

  const convertToExtendedTaskData = (task: TaskData): ExtendedTaskData => ({
    ...task,
    subtasks: task.subtasks
      ? task.subtasks.map(convertToSubTask)
      : initialTasks
          .filter((t) => t.parentId === task.id)
          .map(convertToSubTask),
  });

  type TaskWithSubtasks = TaskData & { subtasks: SubTaskData[] };

  const [localTasks, setLocalTasks] = React.useState<TaskWithSubtasks[]>(
    initialTasks
      .filter((task) => !task.parentId)
      .map((task) => ({
        ...task,
        subtasks: initialTasks
          .filter((t) => t.parentId === task.id)
          .map(convertToSubTask),
      })),
  );

  const [localLists, setLocalLists] = React.useState<ListData[]>(initialLists);
  const [isOpen, setIsOpen] = React.useState(false);

  // Simplified task processing

  // const tasks = propTasks;
  const tasks = propTasks ? propTasks : localTasks;

  const lists = propLists || localLists;

  const [draggedItem, setDraggedItem] = useState<{
    type: "task" | "subtask";
    sourceId: string;
    itemId: string;
  } | null>(null);

  const [dropTarget, setDropTarget] = useState<{
    id: string;
    type: "task" | "subtask-list";
  } | null>(null);

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
      // Create the task using the services/tasks API
      const task = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description,
          listId: taskData.listId,
          priority: taskData.priority || "Medium",
          dueDate: taskData.date,
          dueTime: taskData.isAllDay ? null : taskData.time,
        }),
      }).then((res) => {
        if (!res.ok) {
          throw new Error("Failed to create task");
        }
        return res.json();
      });

      if (propTasks) {
        onTasksChange?.();
      } else {
        setLocalTasks((prev) => [...prev, { ...task, subtasks: [] }]);
      }
      setIsOpen(false);
      toast.success("Task created successfully");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    data: Partial<TaskWithSubtasks>,
  ) => {
    try {
      const { subtasks, ...updateData } = data;
      const updatedTask = await updateTask(taskId, updateData);
      if (propTasks) {
        onTasksChange?.();
      } else {
        setLocalTasks((prev) =>
          prev.map((t) => {
            if (t.id === updatedTask.id) {
              return { ...updatedTask, subtasks: subtasks || t.subtasks };
            }
            return t;
          }),
        );
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      if (propTasks) {
        onTasksChange?.();
      } else {
        setLocalTasks((prev) =>
          prev.filter((t) => t.id !== taskId && t.parentId !== taskId),
        );
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleCreateList = async (name: string) => {
    try {
      const newList = await createList(name);
      if (!propLists) {
        setLocalLists((prev) => [...prev, newList]);
      }
      return newList;
    } catch (error) {
      console.error("Error creating list:", error);
      throw error;
    }
  };

  const handleDragStart = (result: any) => {
    const { type, draggableId, source } = result;
    setDraggedItem({
      type: type === "task" ? "task" : "subtask",
      sourceId: source.droppableId,
      itemId: draggableId,
    });
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type, draggableId } = result;

    setDraggedItem(null);
    setDropTarget(null);

    if (!destination) return;

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    try {
      // Handle task reordering
      if (type === "task") {
        const items = Array.from(tasks);
        const [reorderedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, reorderedItem);

        const updatedItems = items.map((task, index) => ({
          ...task,
          sortOrder: (index + 1) * 1000,
        }));

        // Update all affected tasks' sort orders
        for (const task of updatedItems) {
          await handleUpdateTask(task.id, {
            sortOrder: task.sortOrder,
          });
        }

        if (propTasks) {
          onTasksChange?.();
        } else {
          setLocalTasks(updatedItems as TaskWithSubtasks[]);
        }
      }

      // Handle subtask reordering
      if (type === "subtask") {
        const sourceTask = tasks.find((t) => t.id === source.droppableId);
        const destinationTask = tasks.find(
          (t) => t.id === destination.droppableId,
        );

        if (!sourceTask || !destinationTask) return;

        const subtasks = Array.from(sourceTask.subtasks || []);
        const [movedSubtask] = subtasks.splice(source.index, 1);

        if (source.droppableId === destination.droppableId) {
          // Reordering within the same task
          subtasks.splice(destination.index, 0, movedSubtask);
          const updatedSubtasks = subtasks.map((subtask, index) => ({
            ...subtask,
            sortOrder: (index + 1) * 1000,
          }));

          // Update all affected subtasks' sort orders
          for (const subtask of updatedSubtasks) {
            await updateSubtask(subtask.id, {
              sortOrder: subtask.sortOrder,
            });
          }
        } else {
          // Moving subtask to a different task
          const destSubtasks = Array.from(destinationTask.subtasks || []);
          destSubtasks.splice(destination.index, 0, movedSubtask);

          // Update the moved subtask with new parent and sort order
          await updateSubtask(movedSubtask.id, {
            taskId: destinationTask.id,
            sortOrder: (destination.index + 1) * 1000,
          });

          // Update sort orders of other subtasks in destination task
          const updatedDestSubtasks = destSubtasks.map((subtask, index) => ({
            ...subtask,
            sortOrder: (index + 1) * 1000,
          }));

          for (const subtask of updatedDestSubtasks) {
            if (subtask.id !== movedSubtask.id) {
              await updateSubtask(subtask.id, {
                sortOrder: subtask.sortOrder,
              });
            }
          }
        }

        if (propTasks) {
          onTasksChange?.();
        }
      }
    } catch (error) {
      console.error("Error during drag and drop:", error);
      toast.error("Failed to update task order. Please try again.");
    }
  };

  const handleDragUpdate = (result: any) => {
    if (!result.destination) {
      setDropTarget(null);
      return;
    }

    setDropTarget({
      id: result.destination.droppableId,
      type:
        result.destination.droppableId === "tasks" ? "task" : "subtask-list",
    });
  };

  console.log("before sorted tasks- ", tasks);
  const sortedTasks = [...tasks]
    .filter((task) => !task.parentId)
    .map(convertToExtendedTaskData)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  console.log("sortedTasks- ", sortedTasks);

  const taskItems = (
    <DragDropContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragUpdate={handleDragUpdate}
    >
      <Droppable droppableId="tasks" type="task">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "space-y-3",
              snapshot.isDraggingOver && "rounded-lg bg-accent/5 p-2",
            )}
          >
            {sortedTasks
              .slice(0, showHeader ? 5 : undefined)
              .map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={cn(
                        snapshot.isDragging && "scale-105 opacity-50 shadow-lg",
                        dropTarget?.id === task.id &&
                          "ring-2 ring-primary ring-offset-2",
                      )}
                    >
                      <TaskItem
                        task={task}
                        onUpdate={handleUpdateTask}
                        onDelete={handleDeleteTask}
                        lists={lists}
                        onCreateList={handleCreateList}
                        allTasks={sortedTasks}
                        isDragging={snapshot.isDragging}
                        isDropTarget={dropTarget?.id === task.id}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
            {provided.placeholder}
            {tasks.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );

  if (!showHeader) {
    return taskItems;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Tasks</CardTitle>
          <Button onClick={() => setIsOpen(true)} size="sm" variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </CardHeader>
        <CardContent>{taskItems}</CardContent>
      </Card>
      <TaskDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onCreateTask={handleCreateTask}
        onCreateList={handleCreateList}
        lists={lists}
      />
    </>
  );
}
