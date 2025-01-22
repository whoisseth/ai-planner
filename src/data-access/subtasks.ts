import { db } from "@/db";
import { subtasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { SubTask } from "@/db/schema";

export async function createSubtask(
  taskId: string,
  subtaskData: Omit<SubTask, "id" | "taskId" | "createdAt" | "updatedAt">,
) {
  const [subtask] = await db
    .insert(subtasks)
    .values({
      id: Math.random().toString(36).substr(2, 9),
      taskId,
      ...subtaskData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return subtask;
}

export async function updateSubtask(
  taskId: string,
  subtaskId: string,
  subtaskData: Partial<SubTask>,
) {
  const [updatedSubtask] = await db
    .update(subtasks)
    .set({
      ...subtaskData,
      updatedAt: new Date(),
    })
    .where(and(eq(subtasks.id, subtaskId), eq(subtasks.taskId, taskId)))
    .returning();

  if (!updatedSubtask) {
    throw new Error("Subtask not found");
  }

  return updatedSubtask;
}

export async function deleteSubtask(taskId: string, subtaskId: string) {
  const [deletedSubtask] = await db
    .delete(subtasks)
    .where(and(eq(subtasks.id, subtaskId), eq(subtasks.taskId, taskId)))
    .returning();

  if (!deletedSubtask) {
    throw new Error("Subtask not found");
  }

  return deletedSubtask;
}

export async function getSubtasksByTaskId(taskId: string) {
  const taskSubtasks = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.taskId, taskId))
    .orderBy(subtasks.createdAt);
  return taskSubtasks;
}
