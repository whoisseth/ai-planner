import { db } from "@/db";
import { subtasks } from "@/db/schema";
import { eq } from "drizzle-orm";
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
    })
    .returning();
  return subtask;
}

export async function updateSubtask(
  subtaskId: string,
  subtaskData: Partial<SubTask>,
) {
  const [updatedSubtask] = await db
    .update(subtasks)
    .set({
      ...subtaskData,
      updatedAt: new Date(),
    })
    .where(eq(subtasks.id, subtaskId))
    .returning();
  return updatedSubtask;
}

export async function deleteSubtask(subtaskId: string) {
  await db.delete(subtasks).where(eq(subtasks.id, subtaskId));
}

export async function getSubtasksByTaskId(taskId: string) {
  const taskSubtasks = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.taskId, taskId));
  return taskSubtasks;
}
