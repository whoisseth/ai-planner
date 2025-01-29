// src/app/actions/tasks.ts

"use server";

import { db } from "@/db";
import { tasks, lists } from "@/db/schema";
import { getCurrentUser } from "@/app/api/_lib/session";
import { nanoid } from "nanoid";
import { eq, inArray, and, desc, asc, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { SubTaskData, TaskData } from "@/types/task";
import { z } from "zod";

// Custom error class for task-related errors
class TaskError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "TaskError";
  }
}

// Validation schema for task creation
const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullish(),
  dueDate: z.date().nullish(),
  dueTime: z.string().nullish(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  listId: z.string().min(1, "List ID is required"),
});

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
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new TaskError("Not authenticated", "UNAUTHENTICATED");
    }

    // Validate input data
    const validatedData = createTaskSchema.parse({ ...data, listId });

    // Verify list exists and belongs to user
    const list = await db
      .select()
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, String(user.id))))
      .get();

    if (!list) {
      throw new TaskError("List not found or unauthorized", "LIST_NOT_FOUND");
    }

    const now = new Date();
    const taskId = nanoid();

    // Get the maximum sort order for the list
    const maxSortOrderResult = await db
      .select({ maxSort: max(tasks.sortOrder) })
      .from(tasks)
      .where(and(eq(tasks.listId, listId), eq(tasks.isDeleted, false)))
      .get();

    // Handle the case where maxSort might be null (no existing tasks)
    const newSortOrder = maxSortOrderResult?.maxSort
      ? Number(maxSortOrderResult.maxSort) + 1
      : 0;

    // Create the task
    const task = await db
      .insert(tasks)
      .values({
        id: taskId,
        userId: String(user.id),
        listId: listId,
        type: "main" as const,
        title: validatedData.title,
        description: validatedData.description || null,
        dueDate: validatedData.dueDate || null,
        dueTime: validatedData.dueTime || null,
        priority: validatedData.priority || "Medium",
        completed: false,
        starred: false,
        sortOrder: newSortOrder,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    revalidatePath("/dashboard/lists");
    revalidatePath("/dashboard/tasks");

    return {
      id: task.id,
      userId: task.userId,
      listId: task.listId,
      type: task.type,
      title: task.title,
      description: task.description || undefined,
      dueDate: task.dueDate?.toISOString(),
      dueTime: task.dueTime || undefined,
      priority: task.priority,
      completed: task.completed,
      starred: task.starred,
      sortOrder: task.sortOrder,
      isDeleted: task.isDeleted || false,
      createdAt: task.createdAt!.toISOString(),
      updatedAt: task.updatedAt!.toISOString(),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TaskError(
        "Invalid task data: " + error.message,
        "VALIDATION_ERROR",
      );
    }
    if (error instanceof TaskError) {
      throw error;
    }
    console.error("Error creating task:", error);
    throw new TaskError("Failed to create task", "INTERNAL_ERROR");
  }
}

// Validation schema for task updates
const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullish(),
  dueDate: z.date().nullish(),
  dueTime: z.string().nullish(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  completed: z.boolean().optional(),
  starred: z.boolean().optional(),
  sortOrder: z.number().optional(),
  isDeleted: z.boolean().optional(),
});

export async function updateTask(
  taskId: string,
  data: Partial<TaskData>,
): Promise<TaskData> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Validate input data
  const validatedData = updateTaskSchema.parse(data);
  const now = new Date();

  // Convert the validated data to match database types
  const updateValues = {
    ...(validatedData.title && { title: validatedData.title }),
    ...(validatedData.description !== undefined && {
      description: validatedData.description || null,
    }),
    ...(validatedData.dueDate && {
      dueDate:
        validatedData.dueDate instanceof Date
          ? validatedData.dueDate
          : new Date(validatedData.dueDate),
    }),
    ...(validatedData.dueTime !== undefined && {
      dueTime: validatedData.dueTime || null,
    }),
    ...(validatedData.priority && { priority: validatedData.priority }),
    ...(validatedData.completed !== undefined && {
      completed: validatedData.completed,
    }),
    ...(validatedData.starred !== undefined && {
      starred: validatedData.starred,
    }),
    ...(validatedData.sortOrder !== undefined && {
      sortOrder: validatedData.sortOrder,
    }),
    ...(validatedData.isDeleted !== undefined && {
      isDeleted: validatedData.isDeleted,
    }),
    updatedAt: now,
  } satisfies Partial<{
    title: string;
    description: string | null;
    dueDate: Date | null;
    dueTime: string | null;
    priority: "Low" | "Medium" | "High" | "Urgent";
    completed: boolean;
    starred: boolean;
    sortOrder: number;
    isDeleted: boolean;
    updatedAt: Date;
  }>;

  const task = await db
    .update(tasks)
    .set(updateValues)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, String(user.id))))
    .returning()
    .get();

  if (!task) {
    throw new Error("Task not found or unauthorized");
  }

  const subtasksData = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.parentId, task.id), eq(tasks.isDeleted, false)))
    .orderBy(asc(tasks.sortOrder))
    .all();

  revalidatePath("/dashboard/lists");
  revalidatePath("/dashboard/tasks");

  return {
    id: task.id,
    userId: task.userId,
    listId: task.listId,
    type: task.type,
    title: task.title,
    description: task.description || undefined,
    dueDate: task.dueDate?.toISOString(),
    dueTime: task.dueTime || undefined,
    priority: task.priority,
    completed: task.completed,
    starred: task.starred,
    sortOrder: task.sortOrder,
    isDeleted: task.isDeleted || false,
    createdAt: task.createdAt!.toISOString(),
    updatedAt: task.updatedAt!.toISOString(),
  };
}

export async function deleteTask(taskId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const now = new Date();

  const task = await db
    .update(tasks)
    .set({
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, String(user.id))))
    .returning()
    .get();

  if (!task) {
    throw new Error("Task not found or unauthorized");
  }

  // Soft delete all subtasks
  await db
    .update(tasks)
    .set({
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(tasks.parentId, taskId));

  revalidatePath("/dashboard/lists");
  revalidatePath("/dashboard/tasks");
}

export async function getTasks(): Promise<TaskData[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Fetch all tasks (both main and subtasks)
  const allTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, String(user.id)),
        eq(tasks.isDeleted, false),
      ),
    )
    .orderBy(asc(tasks.sortOrder), desc(tasks.createdAt));

  // Separate main tasks and subtasks
  const mainTasks = allTasks.filter(task => task.type === "main");
  const subtasksByParentId = allTasks
    .filter(task => task.type === "sub")
    .reduce((acc, task) => {
        if (task.parentId) {
            if (!acc[task.parentId]) {
                acc[task.parentId] = [];
              }
              acc[task.parentId].push({
                  id: task.id,
                  taskId: task.parentId,
                  title: task.title,
                  description: task.description || null,
                  completed: task.completed,
                  dueDate: task.dueDate,
                  dueTime: task.dueTime || null,
                  createdAt: task.createdAt!,
                  updatedAt: task.updatedAt!,
                  deletedAt: null,
                  isDeleted: task.isDeleted || false,
                  sortOrder: task.sortOrder
                });
              }
              return acc;
            }, {} as Record<string, any[]>);
            
  // Map main tasks with their subtasks
  const mappedTasks =  mainTasks.map(task => ({
    id: task.id,
    userId: task.userId,
    listId: task.listId,
    type: task.type,
    title: task.title,
    description: task.description || undefined,
    dueDate: task.dueDate?.toISOString(),
    dueTime: task.dueTime || undefined,
    priority: task.priority,
    completed: task.completed,
    starred: task.starred,
    sortOrder: task.sortOrder,
    isDeleted: task.isDeleted || false,
    createdAt: task.createdAt!.toISOString(),
    updatedAt: task.updatedAt!.toISOString(),
    subtasks: subtasksByParentId[task.id] || []
  }));

  return mappedTasks;
}

export async function getStarredTasks(): Promise<TaskData[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const starredTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, String(user.id)),
        eq(tasks.starred, true),
        eq(tasks.isDeleted, false),
        eq(tasks.type, "main"),
      ),
    )
    .orderBy(asc(tasks.sortOrder), desc(tasks.createdAt));

  return Promise.all(
    starredTasks.map(async (task) => {
      const subtasksData = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.parentId, task.id), eq(tasks.isDeleted, false)))
        .orderBy(asc(tasks.sortOrder));

      return {
        id: task.id,
        userId: task.userId,
        listId: task.listId,
        type: task.type,
        title: task.title,
        description: task.description || undefined,
        dueDate: task.dueDate?.toISOString(),
        dueTime: task.dueTime || undefined,
        priority: task.priority,
        completed: task.completed,
        starred: task.starred,
        sortOrder: task.sortOrder,
        isDeleted: task.isDeleted || false,
        createdAt: task.createdAt!.toISOString(),
        updatedAt: task.updatedAt!.toISOString(),
      };
    }),
  );
}

export async function createSubtask(
  taskId: string,
  title: string,
  description?: string,
): Promise<SubTaskData> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Get parent task to verify ownership and get listId
  const parentTask = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, String(user.id))))
    .get();

  if (!parentTask) {
    throw new Error("Parent task not found or unauthorized");
  }

  const now = new Date();
  const subtaskId = nanoid();

  const subtask = await db
    .insert(tasks)
    .values({
      id: subtaskId,
      userId: String(user.id),
      listId: parentTask.listId,
      type: "sub" as const,
      parentId: taskId,
      title,
      description: description || null,
      completed: false,
      dueDate: null,
      dueTime: null,
      priority: "Medium",
      starred: false,
      sortOrder: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .returning()
    .get();

  revalidatePath("/dashboard/lists");

  return {
    id: subtask.id,
    taskId: taskId,
    title: subtask.title,
    description: subtask.description || null,
    completed: subtask.completed,
    dueDate: subtask.dueDate,
    dueTime: subtask.dueTime,
    createdAt: subtask.createdAt || null,
    updatedAt: subtask.updatedAt || null,
    deletedAt: subtask.deletedAt || null,
    isDeleted: subtask.isDeleted,
    sortOrder: subtask.sortOrder,
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
    dueDate: result.dueDate || null,
    dueTime: result.dueTime || null,
    createdAt: result.createdAt || null,
    updatedAt: result.updatedAt || null,
    deletedAt: result.deletedAt || null,
    isDeleted: result.isDeleted,
    sortOrder: result.sortOrder,
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
