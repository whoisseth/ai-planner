import { TaskData, SubTaskData } from "@/types/task";

export type Priority = "Low" | "Medium" | "High" | "Urgent";

export interface ExtendedTaskData extends TaskData {
  subtasks: SubTaskData[];
  tags?: string[];
  status?: "completed" | "in_progress" | "not_started";
}

export interface TaskItemProps {
  task: ExtendedTaskData;
  onUpdate: (taskId: string, data: Partial<ExtendedTaskData>) => void;
  onDelete: (taskId: string) => void;
  lists?: { id: string; name: string }[];
  onCreateList?: (name: string) => Promise<{ id: string; name: string }>;
  allTasks: ExtendedTaskData[];
  onTagsChange?: (taskId: string, tagIds: string[]) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
}

export interface TaskItemState {
  isEditDialogOpen: boolean;
  isSubtaskDialogOpen: boolean;
  isDetailsDialogOpen: boolean;
  isDatePopoverOpen: boolean;
  selectedDate?: Date;
  selectedTime: string;
  isAllDay: boolean;
  editedTask: ExtendedTaskData;
  isExpanded: boolean;
  editingTitle: boolean;
  editingDescription: boolean;
  tempTitle: string;
  tempDescription: string;
  tags: Array<{ id: string; name: string; color: string }>;
  isLoadingSubtask: boolean;
}

export interface TaskItemHeaderProps {
  task: ExtendedTaskData;
  editingTitle: boolean;
  tempTitle: string;
  isExpanded: boolean;
  onStatusChange: () => void;
  onEdit: () => void;
  onAddSubtask: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
  onToggleExpand: () => void;
  onTitleEdit: () => void;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => Promise<void>;
  onDescriptionEdit: (description: string | null) => void;
}

export interface TaskItemContentProps {
  task: ExtendedTaskData;
  isExpanded: boolean;
  editingDescription: boolean;
  tempDescription: string;
  onDescriptionEdit: () => void;
  onDescriptionChange: (value: string) => void;
  onDescriptionBlur: () => void;
}

export interface TaskItemActionsProps {
  task: ExtendedTaskData;
  onEdit: () => void;
  onDelete: () => void;
  onShowDetails: () => void;
  onShowDatePicker: () => void;
}

export interface SubtaskListProps {
  subtasks: SubTaskData[];
  onStatusChange: (subtaskId: string) => Promise<void>;
  onDelete: (subtaskId: string) => Promise<void>;
  onReorder: (subtaskIds: string[]) => Promise<void>;
  onUpdate: (subtaskId: string, data: Partial<SubTaskData>) => Promise<void>;
  onAdd: (title: string) => Promise<void>;
  onAddWithDetails: () => void;
  onSetDueDate: (subtaskId: string) => void;
}

export interface TaskDialogsProps {
  task: ExtendedTaskData;
  state: TaskItemState;
  onStateChange: (newState: Partial<TaskItemState>) => void;
  onUpdate: (taskId: string, data: Partial<ExtendedTaskData>) => void;
  lists?: { id: string; name: string }[];
  onCreateList?: (name: string) => Promise<{ id: string; name: string }>;
  allTasks: ExtendedTaskData[];
  onTagsChange: ((taskId: string, tagIds: string[]) => void) | undefined;
  onCreateSubtask: (data: {
    title: string;
    description?: string | null;
  }) => Promise<void>;
  isLoadingSubtask: boolean;
}

export type { SubTaskData };
