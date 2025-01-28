import { db } from '@/db';
import { tasks, lists, tags, taskTags, taskDependencies } from '@/db/schema';
import { eq, and, lt, sql } from 'drizzle-orm';

// Retention period in days
const RETENTION_PERIOD_DAYS = 15;

interface DeletionResult {
  success: boolean;
  error?: string;
}

/**
 * Soft delete a task and its related items
 */
export async function softDeleteTask(taskId: string): Promise<DeletionResult> {
  try {
    const now = new Date();

    // Soft delete the task
    await db
      .update(tasks)
      .set({
        isDeleted: true,
        deletedAt: now
      })
      .where(eq(tasks.id, taskId));

    // Soft delete subtasks
    await db
      .update(tasks)
      .set({
        isDeleted: true,
        deletedAt: now
      })
      .where(eq(tasks.parentId, taskId));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to delete task'
    };
  }
}

/**
 * Soft delete a list and all its tasks
 */
export async function softDeleteList(listId: string): Promise<DeletionResult> {
  try {
    const now = new Date();

    // Soft delete the list
    await db
      .update(lists)
      .set({
        isDeleted: true,
        deletedAt: now
      })
      .where(eq(lists.id, listId));

    // Soft delete all tasks in the list
    await db
      .update(tasks)
      .set({
        isDeleted: true,
        deletedAt: now
      })
      .where(eq(tasks.listId, listId));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to delete list'
    };
  }
}

/**
 * Soft delete a tag and remove its associations
 */
export async function softDeleteTag(tagId: string): Promise<DeletionResult> {
  try {
    const now = new Date();

    // Remove tag associations
    await db
      .delete(taskTags)
      .where(eq(taskTags.tagId, tagId));

    // Soft delete the tag
    await db
      .update(tags)
      .set({
        isDeleted: true,
        deletedAt: now
      })
      .where(eq(tags.id, tagId));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to delete tag'
    };
  }
}

/**
 * Restore a soft-deleted task and its related items
 */
export async function restoreTask(taskId: string): Promise<DeletionResult> {
  try {
    // Restore the task
    await db
      .update(tasks)
      .set({
        isDeleted: false,
        deletedAt: null
      })
      .where(eq(tasks.id, taskId));

    // Restore subtasks
    await db
      .update(tasks)
      .set({
        isDeleted: false,
        deletedAt: null
      })
      .where(eq(tasks.parentId, taskId));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to restore task'
    };
  }
}

/**
 * Restore a soft-deleted list and its tasks
 */
export async function restoreList(listId: string): Promise<DeletionResult> {
  try {
    // Restore the list
    await db
      .update(lists)
      .set({
        isDeleted: false,
        deletedAt: null
      })
      .where(eq(lists.id, listId));

    // Restore all tasks in the list
    await db
      .update(tasks)
      .set({
        isDeleted: false,
        deletedAt: null
      })
      .where(eq(tasks.listId, listId));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to restore list'
    };
  }
}

/**
 * Clean up expired soft-deleted items
 */
export async function cleanupExpiredItems(): Promise<void> {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() - RETENTION_PERIOD_DAYS);

  try {
    // Delete expired task dependencies
    await db
      .delete(taskDependencies)
      .where(
        sql`EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = task_dependencies.dependent_task_id
          AND tasks.is_deleted = true
          AND tasks.deleted_at < ${expirationDate}
        )`
      );

    // Delete expired task tags
    await db
      .delete(taskTags)
      .where(
        sql`EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = task_tags.task_id
          AND tasks.is_deleted = true
          AND tasks.deleted_at < ${expirationDate}
        )`
      );

    // Delete expired tasks
    await db
      .delete(tasks)
      .where(
        and(
          eq(tasks.isDeleted, true),
          lt(tasks.deletedAt!, expirationDate)
        )
      );

    // Delete expired lists
    await db
      .delete(lists)
      .where(
        and(
          eq(lists.isDeleted, true),
          lt(lists.deletedAt!, expirationDate)
        )
      );

    // Delete expired tags
    await db
      .delete(tags)
      .where(
        and(
          eq(tags.isDeleted, true),
          lt(tags.deletedAt!, expirationDate)
        )
      );
  } catch (error) {
    console.error('Error cleaning up expired items:', error);
  }
}

/**
 * Get items that are pending deletion
 */
export async function getPendingDeletions(userId: string): Promise<{
  tasks: Array<{ id: string; title: string; deletedAt: Date | null }>;
  lists: Array<{ id: string; name: string; deletedAt: Date | null }>;
  tags: Array<{ id: string; name: string; deletedAt: Date | null }>;
}> {
  const [deletedTasks, deletedLists, deletedTags] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        deletedAt: tasks.deletedAt
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.isDeleted, true)
        )
      ),
    db
      .select({
        id: lists.id,
        name: lists.name,
        deletedAt: lists.deletedAt
      })
      .from(lists)
      .where(
        and(
          eq(lists.userId, userId),
          eq(lists.isDeleted, true)
        )
      ),
    db
      .select({
        id: tags.id,
        name: tags.name,
        deletedAt: tags.deletedAt
      })
      .from(tags)
      .where(
        and(
          eq(tags.userId, userId),
          eq(tags.isDeleted, true)
        )
      )
  ]);

  return {
    tasks: deletedTasks.filter(t => t.deletedAt !== null),
    lists: deletedLists.filter(l => l.deletedAt !== null),
    tags: deletedTags.filter(t => t.deletedAt !== null)
  };
} 