export interface SubTaskData {
  id: string;
  taskId: string;
  title: string;
  description: string | null;
  completed: boolean;
  dueDate: Date | null;
  dueTime: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  isDeleted: boolean;
  sortOrder: number;
}

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  userId: string;
  listId: string;
  type: "main" | "sub";
  parentId?: string;
  starred: boolean;
  completed: boolean;
  sortOrder: number;
  dueDate?: string;
  dueTime?: string;
  reminder?: {
    time: string;
    type: "email" | "push" | "both";
    notifiedAt?: string;
    recurrence?: {
      frequency: "none" | "daily" | "weekly" | "monthly" | "yearly";
      interval: number;
      daysOfWeek?: number[];
      endDate?: string;
      count?: number;
    };
  };
  priority: "Low" | "Medium" | "High" | "Urgent";
  tags?: string[];
  dependencies?: string[];
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface ListData {
  id: string;
  name: string;
  userId: string;
  sortOrder: number;
  isDefault: boolean;
  isStarred: boolean;
  isDone: boolean;
  isEditable: boolean;
  isDeletable: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}
