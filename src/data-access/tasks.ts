import { db } from "@/db";
import { tasks } from "@/db/schema";
import { UserId } from "@/use-cases/types";
import { eq, and, ilike, sql } from "drizzle-orm";
import { Task } from "@/db/schema";

export async function createTask(
  userId: UserId,
  taskData: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">,
) {
  const [task] = await db
    .insert(tasks)
    .values({
      id: Math.random().toString(36).substr(2, 9),
      userId,
      ...taskData,
    })
    .returning();
  return task;
}

export async function updateTask(
  userId: UserId,
  taskId: string,
  taskData: Partial<Task>,
) {
  const [updatedTask] = await db
    .update(tasks)
    .set({
      ...taskData,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  if (!updatedTask) {
    throw new Error("Task not found or unauthorized");
  }

  // Fetch the updated task with its subtasks
  const taskWithSubtasks = await getTaskById(userId, taskId);
  return taskWithSubtasks;
}

export async function deleteTask(userId: UserId, taskId: string) {
  const [deletedTask] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  if (!deletedTask) {
    throw new Error("Task not found or unauthorized");
  }

  return deletedTask;
}

export async function getTasksByUserId(userId: UserId) {
  const userTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId));
  return userTasks;
}

export async function getTaskById(userId: UserId, taskId: string) {
  const task = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId) && eq(tasks.userId, userId))
    .limit(1);
  return task[0];
}


// search task by title
export async function searchTaskByTitle(userId: number, searchTerm: string) {
  return await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        sql`lower(${tasks.title}) LIKE lower(${'%' + searchTerm + '%'})`
      )
    );
}

