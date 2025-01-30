// components/TaskItem.tsx
"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import {
  createSubtask,
  updateSubtask,
  deleteSubtask,
  reorderSubtasks,
} from "@/app/actions/tasks";
import { TaskItemHeader } from "./tasks/TaskItemHeader";
import { TaskItemContent } from "./tasks/TaskItemContent";
import { SubtaskList } from "./tasks/SubtaskList";
import { TaskDialogs } from "./tasks/TaskDialogs";
import { TaskItemProps, TaskItemState } from "@/types/TaskItemTypes";
import { SubTaskData } from "@/types/task";
import { getTags } from "@/services/tags";
import { getTaskDependencies, updateTaskDependencies } from "@/services/tasks";
import { Droppable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";

export function TaskItem({
  task,
  onUpdate,
  onDelete,
  lists = [],
  onCreateList,
  allTasks,
  onTagsChange,
  isDragging,
  isDropTarget,
}: TaskItemProps) {
  const [state, setState] = useState<TaskItemState>({
    isEditDialogOpen: false,
    isSubtaskDialogOpen: false,
    isDetailsDialogOpen: false,
    isDatePopoverOpen: false,
    selectedDate: task.dueDate ? new Date(task.dueDate) : undefined,
    selectedTime: task.dueTime || "",
    isAllDay: !task.dueTime,
    editedTask: task,
    isExpanded: false,
    editingTitle: false,
    editingDescription: false,
    tempTitle: task.title,
    tempDescription: task.description || "",
    showDependencies: false,
    dependencies: task.dependencies || [],
    tags: [],
    templates: [],
    isCreatingTemplate: false,
    isLoadingSubtask: false,
  });

  const handleStatusChange = () => {
    onUpdate(task.id, {
      ...task,
      completed: !task.completed,
    });
  };

  const handleDescriptionChange = (value: string) => {
    setState((prev) => ({ ...prev, tempDescription: value }));
  };

  const handleDescriptionBlur = async () => {
    if (state.tempDescription !== task.description) {
      await onUpdate(task.id, {
        ...task,
        description: state.tempDescription,
      });
    }
    setState((prev) => ({ ...prev, editingDescription: false }));
  };

  const handleDependenciesChange = async (dependencyIds: string[]) => {
    try {
      await updateTaskDependencies(task.id, dependencyIds);
      setState((prev) => ({ ...prev, dependencies: dependencyIds }));
      toast({ title: "Dependencies updated successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update dependencies",
        variant: "destructive",
      });
    }
  };

  const handleSubtaskCreate = async (data: {
    title: string;
    description?: string | null;
  }) => {
    try {
      setState((prev) => ({ ...prev, isLoadingSubtask: true }));
      const newSubtask = await createSubtask(
        task.id,
        data.title,
        data.description || undefined,
      );

      onUpdate(task.id, {
        ...task,
        subtasks: [...task.subtasks, newSubtask],
      });

      setState((prev) => ({
        ...prev,
        isSubtaskDialogOpen: false,
        isLoadingSubtask: false,
      }));

      toast({
        title: "Success",
        description: "Subtask created successfully",
      });
    } catch (error) {
      console.error("Failed to create subtask:", error);
      toast({
        title: "Error",
        description: "Failed to create subtask. Please try again.",
        variant: "destructive",
      });
      setState((prev) => ({ ...prev, isLoadingSubtask: false }));
    }
  };

  const handleSubtaskUpdate = async (
    subtaskId: string,
    data: Partial<SubTaskData>,
  ) => {
    try {
      await updateSubtask(subtaskId, data);

      onUpdate(task.id, {
        ...task,
        subtasks: task.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, ...data } : s,
        ),
      });

      toast({
        title: "Success",
        description: "Subtask updated successfully",
      });
    } catch (error) {
      console.error("Failed to update subtask:", error);
      toast({
        title: "Error",
        description: "Failed to update subtask. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubtaskDelete = async (subtaskId: string) => {
    try {
      await deleteSubtask(subtaskId);

      onUpdate(task.id, {
        ...task,
        subtasks: task.subtasks.filter((s) => s.id !== subtaskId),
      });

      toast({
        title: "Success",
        description: "Subtask deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete subtask:", error);
      toast({
        title: "Error",
        description: "Failed to delete subtask. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const deps = await getTaskDependencies(task.id);
        setState((prev) => ({ ...prev, dependencies: deps }));
      } catch (error) {
        console.error("Failed to load dependencies:", error);
      }
    };

    const loadTags = async () => {
      try {
        const fetchedTags = await getTags();
        setState((prev) => ({ ...prev, tags: fetchedTags }));
      } catch (error) {
        console.error("Failed to load tags:", error);
      }
    };

    loadDependencies();
    loadTags();
  }, [task.id]);

  return (
    <Droppable droppableId={task.id}>
      {(provided) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.droppableProps}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: isDragging ? 1.02 : 1,
            boxShadow: isDragging
              ? "0 8px 16px rgba(0,0,0,0.12)"
              : "0 2px 4px rgba(0,0,0,0.05)",
          }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className={`group relative rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md ${
            isDropTarget ? "border-primary" : "border-border"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <TaskItemHeader
                task={task}
                editingTitle={state.editingTitle}
                tempTitle={state.tempTitle}
                isExpanded={state.isExpanded}
                isCreatingTemplate={state.isCreatingTemplate}
                onStatusChange={handleStatusChange}
                onEdit={() =>
                  setState((prev) => ({ ...prev, isEditDialogOpen: true }))
                }
                onAddSubtask={() =>
                  setState((prev) => ({ ...prev, isSubtaskDialogOpen: true }))
                }
                onViewDetails={() =>
                  setState((prev) => ({ ...prev, isDetailsDialogOpen: true }))
                }
                onManageDependencies={() =>
                  setState((prev) => ({ ...prev, showDependencies: true }))
                }
                onApplyTemplate={() => {
                  /* Implement template application logic */
                }}
                onCreateTemplate={() =>
                  setState((prev) => ({ ...prev, isCreatingTemplate: true }))
                }
                onDelete={() => onDelete(task.id)}
                onToggleExpand={() =>
                  setState((prev) => ({
                    ...prev,
                    isExpanded: !prev.isExpanded,
                  }))
                }
                onTitleEdit={() =>
                  setState((prev) => ({ ...prev, editingTitle: true }))
                }
                onTitleChange={(value: string) =>
                  setState((prev) => ({ ...prev, tempTitle: value }))
                }
                onTitleBlur={async () => {
                  if (state.tempTitle !== task.title) {
                    await onUpdate(task.id, {
                      ...task,
                      title: state.tempTitle,
                    });
                  }
                  setState((prev) => ({ ...prev, editingTitle: false }));
                }}
                onDescriptionEdit={(desc: string | null) => {
                  setState((prev) => ({
                    ...prev,
                    tempDescription: desc || "",
                  }));
                }}
              />

              {state.isExpanded && (
                <>
                  <SubtaskList
                    subtasks={task.subtasks}
                    onStatusChange={async (subtaskId: string) => {
                      const subtask = task.subtasks.find(
                        (s) => s.id === subtaskId,
                      );
                      if (subtask) {
                        await handleSubtaskUpdate(subtaskId, {
                          completed: !subtask.completed,
                        });
                      }
                    }}
                    onDelete={handleSubtaskDelete}
                    onReorder={async (subtaskIds: string[]) => {
                      await reorderSubtasks(task.id, subtaskIds);
                    }}
                    onUpdate={handleSubtaskUpdate}
                    onAdd={async (title: string) => {
                      await handleSubtaskCreate({ title });
                    }}
                    onAddWithDetails={() =>
                      setState((prev) => ({
                        ...prev,
                        isSubtaskDialogOpen: true,
                      }))
                    }
                    onSetDueDate={(subtaskId: string) => {
                      setState((prev) => ({
                        ...prev,
                        isDatePopoverOpen: true,
                      }));
                    }}
                  />
                </>
              )}
            </div>
          </div>

          <TaskDialogs
            task={task}
            state={state}
            onStateChange={(newState: Partial<TaskItemState>) =>
              setState((prev) => ({ ...prev, ...newState }))
            }
            onUpdate={onUpdate}
            lists={lists}
            onCreateList={onCreateList}
            allTasks={allTasks}
            onTagsChange={(tagIds: string[]) => onTagsChange?.(task.id, tagIds)}
            onDependenciesChange={handleDependenciesChange}
            onCreateSubtask={handleSubtaskCreate}
            isLoadingSubtask={state.isLoadingSubtask}
          />

          {provided.placeholder}
        </motion.div>
      )}
    </Droppable>
  );
}
