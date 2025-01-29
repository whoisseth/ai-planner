"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { TaskItem, ExtendedTaskData } from "@/components/TaskItem";
import { TaskDialog } from "@/components/TaskDialog";
import type { TaskData, ListData, SubTaskData } from "@/types/task";
import { createTask, updateTask, deleteTask } from "@/app/actions/tasks";
import { createList } from "@/app/actions/lists";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

interface TaskListProps {
  initialTasks?: TaskData[];
  initialLists?: ListData[];
  tasks?: TaskData[];
  lists?: ListData[];
  onTasksChange?: () => Promise<void>;
  showHeader?: boolean;
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
      if (propTasks) {
        onTasksChange?.();
      } else {
        setLocalTasks((prev) => [...prev, { ...task, subtasks: [] }]);
      }
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating task:", error);
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

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const updatedItems = items.map((task, index) => ({
      ...task,
      sortOrder: (index + 1) * 1000,
      subtasks: task.subtasks || [],
    }));
    if (propTasks) {
      await handleUpdateTask(reorderedItem.id, {
        sortOrder: (result.destination.index + 1) * 1000,
      });
      onTasksChange?.();
    } else {
      setLocalTasks(updatedItems);
    }
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="tasks">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-3"
          >
            {sortedTasks
              .slice(0, showHeader ? 5 : undefined)
              .map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <TaskItem
                        task={task}
                        onUpdate={handleUpdateTask}
                        onDelete={handleDeleteTask}
                        lists={lists}
                        onCreateList={handleCreateList}
                        allTasks={sortedTasks}
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
