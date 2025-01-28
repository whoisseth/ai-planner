import { Priority, SubTask } from "@/components/TaskItem";

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

export type TaskData = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  starred: boolean;
  priority: "Low" | "Medium" | "High" | "Urgent";
  dueDate: Date | null;
  dueTime: string | null;
  subtasks: SubTaskData[];
  listId: string;
  userId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  isDeleted: boolean;
  sortOrder: number;
};

export interface ListData {
  id: string;
  name: string;
  userId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  isDeleted: boolean;
  sortOrder: number;
  isDefault?: boolean;
  isStarred?: boolean;
} 