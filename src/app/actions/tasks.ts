"use server";

import { Task, SubTask } from "@/db/schema";
import {
  createTask as createTaskDb,
  updateTask as updateTaskDb,
  deleteTask as deleteTaskDb,
  getTasksByUserId,
  getTaskById,
} from "@/data-access/tasks";
import {
  createSubtask as createSubtaskDb,
  updateSubtask as updateSubtaskDb,
  deleteSubtask as deleteSubtaskDb,
  getSubtasksByTaskId,
} from "@/data-access/subtasks";
import { AuthenticationError } from "@/use-cases/errors";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function createTask(
  taskData: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">,
) {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();

  const task = await createTaskDb(user.id, taskData);
  revalidatePath("/");
  return task;
}

export async function updateTask(taskId: string, taskData: Partial<Task>) {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();

  const task = await getTaskById(user.id, taskId);
  if (!task) throw new Error("Task not found");

  try {
    // Clean up the task data before updating
    const cleanTaskData = {
      ...taskData,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      updatedAt: new Date(),
    };

    const updatedTask = await updateTaskDb(user.id, taskId, cleanTaskData);
    revalidatePath("/");
    return updatedTask;
  } catch (error) {
    console.error("Error updating task:", error);
    throw new Error("Failed to update task");
  }
}

export async function deleteTask(taskId: string) {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();

  try {
    const deletedTask = await deleteTaskDb(user.id, taskId);
    if (!deletedTask) {
      throw new Error("Task not found");
    }
    revalidatePath("/");
    return { success: true, taskId };
  } catch (error) {
    console.error("Error deleting task:", error);
    throw new Error("Failed to delete task");
  }
}

export async function getTasks() {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();

  const tasks = await getTasksByUserId(user.id);
  const tasksWithSubtasks = await Promise.all(
    tasks.map(async (task) => {
      const subtasks = await getSubtasksByTaskId(task.id);
      return { ...task, subtasks };
    }),
  );
  return tasksWithSubtasks;
}

export async function createSubtask(
  taskId: string,
  subtaskData: Omit<SubTask, "id" | "taskId" | "createdAt" | "updatedAt">,
) {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();

  const task = await getTaskById(user.id, taskId);
  if (!task) throw new Error("Task not found");

  try {
    const subtask = await createSubtaskDb(taskId, subtaskData);
    revalidatePath("/");
    return subtask;
  } catch (error) {
    console.error("Error creating subtask:", error);
    throw new Error("Failed to create subtask");
  }
}

export async function updateSubtask(
  taskId: string,
  subtaskId: string,
  subtaskData: Partial<SubTask>,
) {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();

  const task = await getTaskById(user.id, taskId);
  if (!task) throw new Error("Task not found");

  try {
    const updatedSubtask = await updateSubtaskDb(
      taskId,
      subtaskId,
      subtaskData,
    );
    revalidatePath("/");
    return updatedSubtask;
  } catch (error) {
    console.error("Error updating subtask:", error);
    throw new Error("Failed to update subtask");
  }
}

export async function deleteSubtask(taskId: string, subtaskId: string) {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();

  const task = await getTaskById(user.id, taskId);
  if (!task) throw new Error("Task not found");

  try {
    await deleteSubtaskDb(taskId, subtaskId);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting subtask:", error);
    throw new Error("Failed to delete subtask");
  }
}
