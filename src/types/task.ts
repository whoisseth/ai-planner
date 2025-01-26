import { Priority, SubTask } from "@/components/TaskItem";

export interface SubTaskData {
  id: string;
  taskId: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
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
};

export interface ListData {
  id: string;
  name: string;
  userId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
} 