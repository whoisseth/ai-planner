// src/app/actions/tasks.ts

"use server";

import { db } from "@/db";
import { tasks } from "@/db/schema";
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
  },
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
      listId: listId || "1", // Use default list if none provided
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
    updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
  };
}

export async function updateTask(
  taskId: string,
  data: Partial<TaskData>,
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
    .from(tasks)
    .where(eq(tasks.parentId, task.id))
    .all();

  return {
    ...task,
    subtasks: subtasksData.map((s): SubTaskData => ({
      id: s.id,
      taskId: task.id,
      title: s.title,
      description: s.description,
      completed: s.completed,
      dueDate: s.dueDate ? new Date(s.dueDate) : null,
      dueTime: s.dueTime,
      createdAt: s.createdAt ? new Date(s.createdAt) : null,
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : null,
      deletedAt: s.deletedAt ? new Date(s.deletedAt) : null,
      isDeleted: s.isDeleted,
      sortOrder: s.sortOrder
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
        .from(tasks)
        .where(eq(tasks.parentId, task.id))
        .orderBy(asc(tasks.createdAt));

      return {
        ...task,
        subtasks: subtasksData.map((s): SubTaskData => ({
          id: s.id,
          taskId: task.id,
          title: s.title,
          description: s.description,
          completed: s.completed,
          dueDate: s.dueDate ? new Date(s.dueDate) : null,
          dueTime: s.dueTime,
          createdAt: s.createdAt ? new Date(s.createdAt) : null,
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : null,
          deletedAt: s.deletedAt ? new Date(s.deletedAt) : null,
          isDeleted: s.isDeleted,
          sortOrder: s.sortOrder
        })),
        createdAt: task.createdAt ? new Date(task.createdAt) : null,
        updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
      };
    }),
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
    .from(tasks)
    .where(
      and(
        inArray(
          tasks.parentId,
          starredTasks.map((t) => t.id),
        ),
        eq(tasks.type, "sub")
      )
    );

  return starredTasks.map(
    (task): TaskData => ({
      ...task,
      userId: String(task.userId),
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      createdAt: task.createdAt ? new Date(task.createdAt) : null,
      updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
      subtasks: starredSubtasks
        .filter((s) => s.parentId === task.id)
        .map((s): SubTaskData => ({
          id: s.id,
          taskId: task.id,
          title: s.title,
          description: s.description,
          completed: s.completed,
          dueDate: s.dueDate ? new Date(s.dueDate) : null,
          dueTime: s.dueTime,
          createdAt: s.createdAt ? new Date(s.createdAt) : null,
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : null,
          deletedAt: s.deletedAt ? new Date(s.deletedAt) : null,
          isDeleted: s.isDeleted,
          sortOrder: s.sortOrder
        })),
    }),
  );
}

export async function createSubtask(
  taskId: string,
  title: string,
  description?: string,
): Promise<SubTaskData> {
  const id = nanoid();
  const now = new Date();

  const subtask = await db
    .insert(tasks)
    .values({
      id,
      userId: (await getCurrentUser())?.id || "",
      listId: (await db.select().from(tasks).where(eq(tasks.id, taskId)).get())?.listId || "",
      type: "sub",
      parentId: taskId,
      title,
      description: description || null,
      completed: false,
      dueDate: null,
      dueTime: null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
      sortOrder: 0,
      starred: false,
      priority: "Medium"
    })
    .returning();

  const result = subtask[0];
  return {
    id: result.id,
    taskId: taskId,
    title: result.title,
    description: result.description,
    completed: result.completed,
    dueDate: result.dueDate ? new Date(result.dueDate) : null,
    dueTime: result.dueTime,
    createdAt: result.createdAt ? new Date(result.createdAt) : null,
    updatedAt: result.updatedAt ? new Date(result.updatedAt) : null,
    deletedAt: result.deletedAt ? new Date(result.deletedAt) : null,
    isDeleted: result.isDeleted,
    sortOrder: result.sortOrder
  };
}

export async function updateSubtask(
  subtaskId: string,
  data: Partial<SubTaskData>,
): Promise<SubTaskData> {
  const updateData = {
    ...(data.title !== undefined && { title: data.title }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.completed !== undefined && { completed: data.completed }),
    ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
    ...(data.dueTime !== undefined && { dueTime: data.dueTime }),
    updatedAt: new Date(),
  };

  const subtask = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, subtaskId))
    .returning();

  const result = subtask[0];
  return {
    id: result.id,
    taskId: result.parentId || "",
    title: result.title,
    description: result.description,
    completed: result.completed,
    dueDate: result.dueDate ? new Date(result.dueDate) : null,
    dueTime: result.dueTime,
    createdAt: result.createdAt ? new Date(result.createdAt) : null,
    updatedAt: result.updatedAt ? new Date(result.updatedAt) : null,
    deletedAt: result.deletedAt ? new Date(result.deletedAt) : null,
    isDeleted: result.isDeleted,
    sortOrder: result.sortOrder
  };
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  await db.delete(tasks).where(eq(tasks.id, subtaskId));

  revalidatePath("/");
}
