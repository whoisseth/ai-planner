"use server";

import { db } from "@/db";
import { tasks, subtasks, type SubTask } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { nanoid } from "nanoid";
import { eq, inArray, and, desc, asc } from "drizzle-orm";
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
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const task = await db
    .insert(tasks)
    .values({
      id: nanoid(),
      userId: String(user.id),
      listId: listId || '1', // Use default list if none provided
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      priority: data.priority || "Medium",
      completed: false,
      starred: false,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : null,
      dueDate: null,
      dueTime: null
    })),
    createdAt: task.createdAt ? new Date(task.createdAt) : null,
    updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
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
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const tasksData = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, String(user.id)))
    .orderBy(desc(tasks.createdAt));

  const tasksWithSubtasks = await Promise.all(
    tasksData.map(async (task) => {
      const subtasksData = await db
        .select()
        .from(subtasks)
        .where(eq(subtasks.taskId, task.id))
        .orderBy(asc(subtasks.createdAt));

      return {
        ...task,
        subtasks: subtasksData.map(s => ({
          ...s,
          createdAt: s.createdAt ? new Date(s.createdAt) : null,
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : null,
          dueDate: s.dueDate ? new Date(s.dueDate) : null,
          dueTime: s.dueTime || null
        })),
        createdAt: task.createdAt ? new Date(task.createdAt) : null,
        updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
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

export async function createSubtask(taskId: string, title: string, description?: string) {
  const id = nanoid();
  const now = new Date();
  
  const subtask = await db.insert(subtasks).values({
    id,
    taskId,
    title,
    description: description || null,
    completed: false,
    dueDate: null,
    dueTime: null,
    createdAt: now,
    updatedAt: now,
  }).returning();
  
  const result = subtask[0];
  return {
    id: result.id,
    taskId: result.taskId,
    title: result.title,
    description: result.description,
    completed: result.completed,
    dueDate: result.dueDate,
    dueTime: result.dueTime,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  } as SubTaskData;
}

export async function updateSubtask(subtaskId: string, data: Partial<SubTaskData>) {
  const updateData = {
    ...(data.title !== undefined && { title: data.title }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.completed !== undefined && { completed: data.completed }),
    ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
    ...(data.dueTime !== undefined && { dueTime: data.dueTime }),
    updatedAt: new Date(),
  };

  const subtask = await db
    .update(subtasks)
    .set(updateData)
    .where(eq(subtasks.id, subtaskId))
    .returning();
    
  const result = subtask[0];
  return {
    id: result.id,
    taskId: result.taskId,
    title: result.title,
    description: result.description,
    completed: result.completed,
    dueDate: result.dueDate,
    dueTime: result.dueTime,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  } as SubTaskData;
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  await db.delete(subtasks).where(eq(subtasks.id, subtaskId));

  revalidatePath("/");
}
