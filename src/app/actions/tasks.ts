"use server";

import { Task, SubTask } from "@/db/schema";
import {
  createTask as createTaskDb,
  updateTask as updateTaskDb,
  deleteTask as deleteTaskDb,
  getTasksByUserId,
  getTaskById,
  searchTaskByTitle as searchTaskByTitleDb,
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
import { UserId } from "@/types";


export async function createTask(
  taskData: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">,
) {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();

  const task = await createTaskDb(user.id, taskData);
  revalidatePath("/");
  return task;
}

export async function updateTask(taskId: string, updateData: any) {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();

  try {
    console.log("Updating task with ID:", taskId);
    console.log("Update data:", updateData);

    // Validate task ID
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    // Get the current task first
    const currentTask = await getTaskById(user.id, taskId);
    if (!currentTask) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Prepare update data
    const validUpdateData: any = {
      updatedAt: new Date()
    };

    // Handle title updates - ensure it's a non-empty string
    if (updateData.title !== undefined) {
      if (typeof updateData.title !== 'string' || updateData.title.trim() === '') {
        throw new Error("Title must be a non-empty string");
      }
      validUpdateData.title = updateData.title.trim();
    }

    // Handle priority updates
    if (updateData.priority !== undefined) {
      const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
      const priority = typeof updateData.priority === 'string' ?
        updateData.priority.charAt(0).toUpperCase() + updateData.priority.slice(1).toLowerCase() :
        updateData.priority;

      if (!validPriorities.includes(priority)) {
        throw new Error("Invalid priority value. Must be one of: Low, Medium, High, Urgent");
      }
      validUpdateData.priority = priority;
    }

    // Handle completion status
    if (updateData.completed !== undefined) {
      validUpdateData.completed = Boolean(updateData.completed);
    }

    // Handle dueDate - ensure it's a valid date or null
    if (updateData.dueDate !== undefined) {
      if (updateData.dueDate === null) {
        validUpdateData.dueDate = null;
      } else {
        const parsedDate = new Date(updateData.dueDate);
        if (isNaN(parsedDate.getTime())) {
          throw new Error("Invalid due date format");
        }
        validUpdateData.dueDate = parsedDate;
      }
    }

    // Handle dueTime - ensure it's a valid time string or null
    if (updateData.dueTime !== undefined) {
      if (updateData.dueTime === null) {
        validUpdateData.dueTime = null;
      } else if (typeof updateData.dueTime === 'string' && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(updateData.dueTime)) {
        validUpdateData.dueTime = updateData.dueTime;
      } else {
        throw new Error("Invalid time format. Please use HH:mm format");
      }
    }

    console.log("Prepared update data:", validUpdateData);

    // Ensure we have at least one field to update
    if (Object.keys(validUpdateData).length === 1 && validUpdateData.updatedAt) {
      throw new Error("No valid fields to update");
    }

    // Update the task using the data access function
    const updatedTask = await updateTaskDb(user.id, taskId, validUpdateData);
    if (!updatedTask) {
      throw new Error("Failed to update task in database");
    }

    console.log("Task updated successfully:", updatedTask);

    // Get subtasks
    const subtasks = await getSubtasksByTaskId(taskId);
    const taskWithSubtasks = { ...updatedTask, subtasks };

    revalidatePath("/");
    return taskWithSubtasks;
  } catch (error) {
    console.error("Error updating task:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
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


// seach task by title
export async function searchTaskByTitle(title: string) {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();

  try {
    const tasks = await searchTaskByTitleDb(user.id, title);
    return tasks;
  } catch (error) {
    console.error("Error searching task by title:", error);
    throw new Error("Failed to search task by title");
  }
}
