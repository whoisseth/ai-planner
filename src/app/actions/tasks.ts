"use server";

import { db } from "@/db";
import { tasks, subtasks } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { nanoid } from "nanoid";
import { eq, inArray, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { SubTaskData, TaskData } from "@/types/task";

export async function createTask(
  listId: string,
  data: {
    title: string;
    description?: string | null;
    dueDate?: Date | null;
    dueTime?: string | null;
    priority?: "Low" | "Medium" | "High" | "Urgent";
  }
): Promise<TaskData> {
  const task = await db
    .insert(tasks)
    .values({
      id: nanoid(),
      userId: "1", // Temporary user ID
      listId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      priority: data.priority,
    })
    .returning()
    .get();

  return { 
    ...task, 
    subtasks: [],
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    createdAt: task.createdAt ? new Date(task.createdAt) : null,
    updatedAt: task.updatedAt ? new Date(task.updatedAt) : null
  };
}

export async function updateTask(
  taskId: string,
  data: Partial<TaskData>
): Promise<TaskData> {
  const updateData = {
    ...data,
    updatedAt: new Date(),
  };

  const task = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId))
    .returning()
    .get();

  const subtasksData = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.taskId, task.id))
    .all();

  return { 
    ...task, 
    subtasks: subtasksData.map(s => ({
      ...s,
      createdAt: s.createdAt ? new Date(s.createdAt) : null,
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : null
    })),
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    createdAt: task.createdAt ? new Date(task.createdAt) : null,
    updatedAt: task.updatedAt ? new Date(task.updatedAt) : null
  };
}

export async function deleteTask(taskId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  await db.delete(tasks).where(eq(tasks.id, taskId));

  revalidatePath("/");
}

export async function getTasks(): Promise<TaskData[]> {
  const tasksData = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      completed: tasks.completed,
      starred: tasks.starred,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      dueTime: tasks.dueTime,
      listId: tasks.listId,
      userId: tasks.userId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.userId, "1")) // Temporary user ID
    .groupBy(tasks.id)
    .all();

  const tasksWithSubtasks = await Promise.all(
    tasksData.map(async (task) => {
      const subtasksData = await db
        .select()
        .from(subtasks)
        .where(eq(subtasks.taskId, task.id))
        .all();

      return {
        ...task,
        subtasks: subtasksData.map(s => ({
          ...s,
          createdAt: s.createdAt ? new Date(s.createdAt) : null,
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : null
        })),
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        createdAt: task.createdAt ? new Date(task.createdAt) : null,
        updatedAt: task.updatedAt ? new Date(task.updatedAt) : null
      };
    })
  );

  return tasksWithSubtasks;
}

export async function getStarredTasks(): Promise<TaskData[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const starredTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, String(user.id)), eq(tasks.starred, true)))
    .orderBy(tasks.createdAt);

  const starredSubtasks = await db
    .select()
    .from(subtasks)
    .where(inArray(subtasks.taskId, starredTasks.map(t => t.id)));

  return starredTasks.map((task): TaskData => ({
    ...task,
    userId: String(task.userId),
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    createdAt: task.createdAt ? new Date(task.createdAt) : null,
    updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
    subtasks: starredSubtasks
      .filter(s => s.taskId === task.id)
      .map(s => ({
        ...s,
        createdAt: s.createdAt ? new Date(s.createdAt) : null,
        updatedAt: s.updatedAt ? new Date(s.updatedAt) : null,
        description: s.description || null
      }))
  }));
}

export async function createSubtask(taskId: string, title: string, description?: string): Promise<SubTaskData> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const subtask = await db
    .insert(subtasks)
    .values({
      id: nanoid(),
      taskId,
      title,
      description,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
    .get();

  revalidatePath("/");
  return { ...subtask, description: description || null };
}

export async function updateSubtask(subtaskId: string, data: Partial<{
  title: string;
  description: string | null;
  completed: boolean;
}>): Promise<SubTaskData> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  
  const subtask = await db
    .update(subtasks)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(subtasks.id, subtaskId))
    .returning()
    .get();

  revalidatePath("/");
  return subtask;
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  await db.delete(subtasks).where(eq(subtasks.id, subtaskId));

  revalidatePath("/");
}
