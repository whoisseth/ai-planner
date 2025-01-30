import { Task } from "@/db/schema";

export interface CreateTaskData {
  title: string;
  description?: string;
  listId: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  dueDate?: string;
  dueTime?: string;
}

/**
 * Creates a new task
 * @param data Task creation data
 * @returns Created task
 */
export async function createTask(data: CreateTaskData): Promise<Task> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

/**
 * Updates an existing task
 * @param id Task ID
 * @param data Task update data
 * @returns Updated task
 */
export async function updateTask(
  taskId: string,
  data: Partial<Task>
): Promise<Task> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

/**
 * Deletes a task
 * @param id Task ID
 */
export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
}

/**
 * Gets all tasks
 * @returns Array of tasks
 */
export async function getTasks(): Promise<Task[]> {
  const response = await fetch("/api/tasks");

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
} 