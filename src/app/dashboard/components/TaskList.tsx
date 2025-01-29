// src/app/dashboard/components/TaskList.tsx

"use client";

import { useMemo, useCallback } from "react";
import { TaskData } from "@/types/task";
import { TaskItem } from "@/components/TaskItem";
import { updateTask, deleteTask } from "@/app/actions/tasks";
import { toast } from "sonner";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
} from "@hello-pangea/dnd";
import { ExtendedTaskData } from "@/components/TaskItem";

interface TaskListProps {
  tasks: ExtendedTaskData[];
  onTasksChange?: () => void;
  onUpdate?: (taskId: string, taskData: Partial<ExtendedTaskData>) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  lists?: { id: string; name: string }[];
  onCreateList?: (name: string) => Promise<{ id: string; name: string }>;
  onReorder?: (taskId: string, newSortOrder: number) => Promise<void>;
}

export function TaskList({
  tasks,
  onTasksChange,
  onUpdate,
  onDelete,
  lists = [],
  onCreateList,
  onReorder,
}: TaskListProps) {
  const [animationParent] = useAutoAnimate<HTMLDivElement>();

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [tasks]
  );

  const handleUpdateTask = useCallback(async (
    taskId: string,
    taskData: Partial<ExtendedTaskData>,
  ) => {
    try {
      await updateTask(taskId, taskData);
      toast.success("Task updated successfully");
      onTasksChange?.();
    } catch (error) {
      toast.error("Failed to update task");
      console.error("Error updating task:", error);
    }
  }, [onTasksChange]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted successfully");
      onTasksChange?.();
    } catch (error) {
      toast.error("Failed to delete task");
      console.error("Error deleting task:", error);
    }
  }, [onTasksChange]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || !onReorder) return;

    const taskId = result.draggableId;
    const newIndex = result.destination.index;

    let newSortOrder: number;

    if (newIndex === 0) {
      newSortOrder = (sortedTasks[0]?.sortOrder || 0) - 1000;
    } else if (newIndex === tasks.length - 1) {
      newSortOrder = (sortedTasks[sortedTasks.length - 1]?.sortOrder || 0) + 1000;
    } else {
      const prevTask = sortedTasks[newIndex - 1];
      const nextTask = sortedTasks[newIndex];
      newSortOrder = ((prevTask?.sortOrder || 0) + (nextTask?.sortOrder || 0)) / 2;
    }

    try {
      await onReorder(taskId, newSortOrder);
      onTasksChange?.();
    } catch (error) {
      toast.error("Failed to reorder task");
      console.error("Error reordering task:", error);
    }
  }, [onReorder, onTasksChange, sortedTasks, tasks.length]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="tasks">
        {(provided: DroppableProvided) => (
          <div
            className="space-y-2"
            {...provided.droppableProps}
            ref={animationParent}
          >
            <div ref={provided.innerRef}>
              {sortedTasks.map((task, index) => (
                <Draggable
                  key={task.id}
                  draggableId={task.id}
                  index={index}
                  isDragDisabled={task.type === "sub"}
                >
                  {(provided: DraggableProvided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <TaskItem
                        task={task}
                        onUpdate={onUpdate || handleUpdateTask}
                        onDelete={onDelete || handleDeleteTask}
                        lists={lists}
                        onCreateList={onCreateList}
                        allTasks={tasks}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {tasks.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No tasks available
                </p>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
