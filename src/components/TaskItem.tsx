// components/TaskItem.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MoreHorizontal,
  Plus,
  Trash,
  Calendar,
  Edit,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  CheckCircle2,
  Clock,
  Link2,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from "@/app/actions/tasks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskEditDialog } from "./TaskEditDialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import type { TaskData, SubTaskData } from "@/types/task";
import { TaskDependenciesModal } from "@/components/TaskDependenciesModal";
import { Template } from "@/db/schema";
import {
  applyTemplate,
  getTemplates,
  createTemplate,
} from "@/services/templates";
import { TagInput, Tag } from "@/components/TagInput";
import { createTag, getTags, updateTaskTags } from "@/services/tags";
import { getTaskDependencies, updateTaskDependencies } from "@/services/tasks";
import { TaskItemHeader } from "./tasks/TaskItemHeader";
import { SubtaskList } from "./tasks/SubtaskList";
import { TaskDialogs } from "./tasks/TaskDialogs";

export type Priority = "Low" | "Medium" | "High" | "Urgent";

export interface ExtendedTaskData extends TaskData {
  subtasks: SubTaskData[];
  tags?: string[];
}

export interface TaskItemProps {
  task: ExtendedTaskData;
  onUpdate: (taskId: string, data: Partial<ExtendedTaskData>) => void;
  onDelete: (taskId: string) => void;
  lists?: { id: string; name: string }[];
  onCreateList?: (name: string) => Promise<{ id: string; name: string }>;
  allTasks: ExtendedTaskData[];
  onTagsChange?: (taskId: string, tagIds: string[]) => void;
}

export function TaskItem({
  task,
  onUpdate,
  onDelete,
  lists = [],
  onCreateList,
  allTasks,
  onTagsChange,
}: TaskItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined,
  );
  const [selectedTime, setSelectedTime] = useState(task.dueTime || "");
  const [isAllDay, setIsAllDay] = useState(!task.dueTime);
  const [editedTask, setEditedTask] = useState(task);
  const [newSubtask, setNewSubtask] = useState("");
  const [newSubtaskDescription, setNewSubtaskDescription] = useState("");
  const [editingSubtask, setEditingSubtask] = useState<SubTaskData | null>(
    null,
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickAddSubtask, setQuickAddSubtask] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempTitle, setTempTitle] = useState(task.title);
  const [tempDescription, setTempDescription] = useState(
    task.description || "",
  );
  const [editingSubtaskInline, setEditingSubtaskInline] = useState<
    string | null
  >(null);
  const [tempSubtaskTitle, setTempSubtaskTitle] = useState("");
  const [tempSubtaskDescription, setTempSubtaskDescription] = useState("");
  const [editingSubtaskDescription, setEditingSubtaskDescription] = useState<
    string | null
  >(null);
  const [isSubtaskDueDateDialogOpen, setIsSubtaskDueDateDialogOpen] =
    useState(false);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(
    null,
  );
  const [showDependencies, setShowDependencies] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [tags, setTags] = useState<
    Array<{ id: string; name: string; color: string }>
  >([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const subtaskTitleRef = useRef<HTMLDivElement>(null);
  const subtaskDescriptionRef = useRef<HTMLDivElement>(null);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(false);
  const [dependencies, setDependencies] = useState<string[]>([]);

  const handleStatusChange = () => {
    onUpdate(task.id, {
      completed: !task.completed,
      description: task.description,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      listId: task.listId,
    });
  };

  const handleSaveEdit = async (taskData: {
    title: string;
    description?: string;
    listId: string;
    isAllDay?: boolean;
    date?: string;
    time?: string;
    priority?: Priority;
  }) => {
    try {
      await onUpdate(task.id, {
        title: taskData.title,
        description: taskData.description,
        listId: taskData.listId,
        dueDate: taskData.date,
        dueTime: taskData.time,
        priority: taskData.priority,
      });
      setIsEditDialogOpen(false);
      toast({
        title: "Task updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
      console.error("Failed to update task:", error);
    }
  };

  const handleAddSubtask = async (
    subtaskTitle: string,
    subtaskDescription = "",
  ) => {
    if (subtaskTitle.trim()) {
      try {
        const description = subtaskDescription.trim();
        const subtask = await createSubtask(
          task.id,
          subtaskTitle.trim(),
          description || undefined,
        );

        // Create a new subtask object with all required fields
        const newSubtask: SubTaskData = {
          id: subtask.id,
          taskId: task.id,
          title: subtaskTitle.trim(),
          description: description || null,
          completed: false,
          dueDate: null,
          dueTime: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          isDeleted: false,
          sortOrder: (task.subtasks?.length || 0) + 1,
        };

        // Update the parent task with the new subtask
        const updatedTask: ExtendedTaskData = {
          ...task,
          subtasks: [...(task.subtasks || []), newSubtask],
        };

        onUpdate(task.id, updatedTask);

        setNewSubtask("");
        setNewSubtaskDescription("");
        setQuickAddSubtask("");
        setIsSubtaskDialogOpen(false);
        toast({
          title: "Subtask added successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to add subtask",
          variant: "destructive",
        });
        console.error("Failed to add subtask:", error);
      }
    }
  };

  const handleSubtaskStatusChange = async (subtaskId: string) => {
    try {
      const subtask = task.subtasks.find((st) => st.id === subtaskId);
      if (subtask) {
        const updatedSubtask = await updateSubtask(subtaskId, {
          completed: !subtask.completed,
          description: subtask.description,
        });

        // Update the parent task with the updated subtask
        onUpdate(task.id, {
          ...task,
          subtasks: task.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, ...updatedSubtask } : st,
          ),
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subtask",
        variant: "destructive",
      });
      console.error("Failed to update subtask:", error);
    }
  };

  const handleUpdateSubtask = async (
    subtaskId: string,
    data: Partial<SubTaskData>,
  ) => {
    try {
      await updateSubtask(subtaskId, data);
      onUpdate(task.id, {
        ...task,
        subtasks: task.subtasks.map((st) =>
          st.id === subtaskId ? { ...st, ...data } : st,
        ),
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subtask",
        variant: "destructive",
      });
      console.error("Failed to update subtask:", error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await deleteSubtask(subtaskId);

      // Update the parent task by removing the deleted subtask
      onUpdate(task.id, {
        ...task,
        subtasks: task.subtasks.filter((st) => st.id !== subtaskId),
      });

      toast({
        title: "Subtask deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete subtask",
        variant: "destructive",
      });
      console.error("Failed to delete subtask:", error);
    }
  };

  const handleQuickAddSubtask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && quickAddSubtask.trim()) {
      handleAddSubtask(quickAddSubtask);
    }
  };

  const handleTitleEdit = (e: React.MouseEvent) => {
    if (!editingTitle) {
      e.preventDefault();
      setEditingTitle(true);
      setTempTitle(task.title);
    }
  };

  const handleTitleBlur = async () => {
    const newTitle = titleRef.current?.textContent?.trim();
    if (newTitle && newTitle !== task.title) {
      await onUpdate(task.id, { ...task, title: newTitle });
    }
    setEditingTitle(false);
  };

  const handleDescriptionEdit = (e: React.MouseEvent) => {
    if (!editingDescription) {
      e.preventDefault();
      setEditingDescription(true);
      setTempDescription(task.description || "");
    }
  };

  const handleDescriptionBlur = async () => {
    const newDescription = descriptionRef.current?.textContent?.trim();
    await onUpdate(task.id, {
      ...task,
      description: newDescription || undefined,
    });
    setEditingDescription(false);
  };

  const handleSubtaskTitleEdit =
    (subtaskId: string) => (e: React.MouseEvent) => {
      if (editingSubtaskInline !== subtaskId) {
        e.preventDefault();
        setEditingSubtaskInline(subtaskId);
        setTempSubtaskTitle(
          task.subtasks.find((st) => st.id === subtaskId)?.title || "",
        );
      }
    };

  const handleSubtaskTitleBlur = async (subtaskId: string) => {
    const newTitle = subtaskTitleRef.current?.textContent?.trim();
    if (newTitle) {
      const subtask = task.subtasks.find((st) => st.id === subtaskId);
      await handleUpdateSubtask(subtaskId, {
        title: newTitle,
        description: subtask?.description || null,
      });
    }
    setEditingSubtaskInline(null);
  };

  const handleSubtaskDescriptionBlur = async (subtaskId: string) => {
    const newDescription = subtaskDescriptionRef.current?.textContent?.trim();
    const subtask = task.subtasks.find((st) => st.id === subtaskId);
    if (subtask) {
      await handleUpdateSubtask(subtaskId, {
        title: subtask.title,
        description: newDescription || null,
      });
    }
    setEditingSubtaskDescription(null);
  };

  const handleUpdateSubtaskDueDate = async (
    subtaskId: string,
    date: Date | null,
    time: string | null,
  ) => {
    try {
      const subtask = task.subtasks.find((st) => st.id === subtaskId);
      if (subtask) {
        await handleUpdateSubtask(subtaskId, {
          title: subtask.title,
          description: subtask.description,
          dueDate: date,
          dueTime: time,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subtask due date",
        variant: "destructive",
      });
      console.error("Failed to update subtask due date:", error);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      onUpdate(task.id, {
        dueDate: date.toISOString().split("T")[0],
        dueTime: isAllDay ? undefined : selectedTime,
      });
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    setSelectedTime(time);
    if (selectedDate) {
      onUpdate(task.id, {
        dueTime: time || undefined,
        dueDate: selectedDate.toISOString().split("T")[0],
      });
    }
  };

  const handleAllDayToggle = (checked: boolean) => {
    setIsAllDay(checked);
    if (selectedDate) {
      onUpdate(task.id, {
        dueDate: selectedDate.toISOString().split("T")[0],
        dueTime: checked ? undefined : selectedTime,
      });
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      await applyTemplate(templateId, task.listId);
      // Refresh tasks after applying template
      onUpdate?.(task.id, {});
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive",
      });
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setIsCreatingTemplate(true);
      const template = await createTemplate({
        name: task.title,
        description: task.description || undefined,
        settings: {
          title: task.title,
          description: task.description || undefined,
          priority: task.priority,
          defaultSubtasks: task.subtasks?.map((subtask) => ({
            title: subtask.title,
            description: subtask.description || undefined,
          })),
        },
        isPublic: false,
      });
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  const handleCreateTag = async (name: string) => {
    try {
      const color = `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`;
      const newTag = await createTag({ name, color });
      setTags((prev) => [...prev, newTag]);
      return newTag;
    } catch (error) {
      console.error("Failed to create tag:", error);
      toast({
        title: "Error",
        description: "Failed to create tag",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleTagsChange = async (tagIds: string[]) => {
    try {
      await updateTaskTags(task.id, tagIds);
      onTagsChange?.(task.id, tagIds);
    } catch (error) {
      console.error("Failed to update task tags:", error);
      toast({
        title: "Error",
        description: "Failed to update task tags",
        variant: "destructive",
      });
    }
  };

  const handleDependenciesChange = async (dependencyIds: string[]) => {
    try {
      await updateTaskDependencies(task.id, dependencyIds);
      setDependencies(dependencyIds);
      onUpdate(task.id, { ...task, dependencies: dependencyIds });
    } catch (error) {
      console.error("Failed to update dependencies:", error);
      toast({
        title: "Error",
        description: "Failed to update task dependencies",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(titleRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [editingTitle]);

  useEffect(() => {
    if (editingDescription && descriptionRef.current) {
      descriptionRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(descriptionRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [editingDescription]);

  useEffect(() => {
    if (editingSubtaskInline && subtaskTitleRef.current) {
      subtaskTitleRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(subtaskTitleRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [editingSubtaskInline]);

  useEffect(() => {
    if (editingSubtaskDescription && subtaskDescriptionRef.current) {
      subtaskDescriptionRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(subtaskDescriptionRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [editingSubtaskDescription]);

  useEffect(() => {
    if (isTemplateDialogOpen) {
      const loadTemplates = async () => {
        setIsLoadingTemplates(true);
        try {
          const templates = await getTemplates();
          setTemplates(templates);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to load templates",
            variant: "destructive",
          });
        } finally {
          setIsLoadingTemplates(false);
        }
      };

      loadTemplates();
    }
  }, [isTemplateDialogOpen]);

  useEffect(() => {
    const loadTags = async () => {
      setIsLoadingTags(true);
      try {
        const tags = await getTags();
        setTags(tags);
      } catch (error) {
        console.error("Failed to load tags:", error);
        toast({
          title: "Error",
          description: "Failed to load tags",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTags(false);
      }
    };

    loadTags();
  }, []);

  useEffect(() => {
    const loadDependencies = async () => {
      setIsLoadingDependencies(true);
      try {
        const deps = await getTaskDependencies(task.id);
        setDependencies(deps);
      } catch (error) {
        console.error("Failed to load dependencies:", error);
        toast({
          title: "Error",
          description: "Failed to load task dependencies",
          variant: "destructive",
        });
      } finally {
        setIsLoadingDependencies(false);
      }
    };

    loadDependencies();
  }, [task.id]);

  return (
    <div className="group relative flex flex-col gap-3 border-b border-border/40 px-2 py-3 transition-colors last:border-b-0 hover:bg-accent/5 sm:px-3">
      <TaskItemHeader
        task={task}
        isExpanded={isExpanded}
        isCreatingTemplate={isCreatingTemplate}
        onStatusChange={handleStatusChange}
        onEdit={() => setIsEditDialogOpen(true)}
        onAddSubtask={() => setIsSubtaskDialogOpen(true)}
        onViewDetails={() => setIsDetailsDialogOpen(true)}
        onManageDependencies={() => setShowDependencies(true)}
        onApplyTemplate={() => setIsEditDialogOpen(true)}
        onCreateTemplate={handleCreateTemplate}
        onDelete={() => onDelete(task.id)}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        onTitleEdit={(newTitle: string) => onUpdate(task.id, { ...task, title: newTitle })}
        onDescriptionEdit={(newDescription: string | null) =>
          onUpdate(task.id, { ...task, description: newDescription || undefined })
        }
      />

      {isExpanded && (
        <SubtaskList
          subtasks={task.subtasks}
          onStatusChange={handleSubtaskStatusChange}
          onUpdate={handleUpdateSubtask}
          onDelete={handleDeleteSubtask}
          onAdd={handleAddSubtask}
          onAddWithDetails={() => setIsSubtaskDialogOpen(true)}
          onSetDueDate={(subtaskId: string) => {
            setSelectedSubtaskId(subtaskId);
            setIsSubtaskDueDateDialogOpen(true);
          }}
        />
      )}

      <TaskDialogs
        task={task}
        isEditDialogOpen={isEditDialogOpen}
        isSubtaskDialogOpen={isSubtaskDialogOpen}
        isDetailsDialogOpen={isDetailsDialogOpen}
        isSubtaskDueDateDialogOpen={isSubtaskDueDateDialogOpen}
        showDependencies={showDependencies}
        selectedSubtaskId={selectedSubtaskId}
        lists={lists}
        allTasks={allTasks}
        tags={tags}
        dependencies={dependencies}
        onEditDialogClose={() => setIsEditDialogOpen(false)}
        onSubtaskDialogClose={() => setIsSubtaskDialogOpen(false)}
        onDetailsDialogClose={() => setIsDetailsDialogOpen(false)}
        onSubtaskDueDateDialogClose={() => setIsSubtaskDueDateDialogOpen(false)}
        onDependenciesClose={() => setShowDependencies(false)}
        onSaveEdit={handleSaveEdit}
        onAddSubtask={handleAddSubtask}
        onUpdateSubtaskDueDate={(subtaskId: string, date: Date | null, time: string | null) =>
          handleUpdateSubtask(subtaskId, { dueDate: date, dueTime: time })
        }
        onSubtaskStatusChange={handleSubtaskStatusChange}
        onTagsChange={handleTagsChange}
        onDependenciesChange={handleDependenciesChange}
        onCreateList={onCreateList}
      />
    </div>
  );
}
