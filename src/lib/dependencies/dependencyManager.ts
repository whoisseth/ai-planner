import { Task } from '@/db/schema';
import { db } from '@/db';
import { taskDependencies, tasks } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface DependencyChain {
  taskId: string;
  prerequisites: Array<{
    taskId: string;
    completed: boolean;
    dueDate: Date | null;
  }>;
}

/**
 * Check if adding a dependency would create a circular reference
 */
export async function wouldCreateCircularDependency(
  dependentTaskId: string,
  prerequisiteTaskId: string
): Promise<boolean> {
  // Get all tasks that depend on the prerequisite task (directly or indirectly)
  const dependentTasks = await findAllDependentTasks(prerequisiteTaskId);
  
  // If the dependent task is in this list, adding the dependency would create a cycle
  return dependentTasks.includes(dependentTaskId);
}

/**
 * Find all tasks that depend on a given task (directly or indirectly)
 */
async function findAllDependentTasks(taskId: string): Promise<string[]> {
  const dependentTasks: Set<string> = new Set();
  const queue: string[] = [taskId];

  while (queue.length > 0) {
    const currentTaskId = queue.shift()!;
    
    // Find direct dependents
    const directDependents = await db
      .select({
        dependentTaskId: taskDependencies.dependentTaskId
      })
      .from(taskDependencies)
      .where(eq(taskDependencies.prerequisiteTaskId, currentTaskId));

    // Add new dependents to the queue
    for (const { dependentTaskId } of directDependents) {
      if (!dependentTasks.has(dependentTaskId)) {
        dependentTasks.add(dependentTaskId);
        queue.push(dependentTaskId);
      }
    }
  }

  return Array.from(dependentTasks);
}

/**
 * Get the complete dependency chain for a task
 */
export async function getDependencyChain(taskId: string): Promise<DependencyChain> {
  const prerequisites = await db
    .select({
      taskId: taskDependencies.prerequisiteTaskId,
      completed: tasks.completed,
      dueDate: tasks.dueDate
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(taskDependencies.prerequisiteTaskId, tasks.id))
    .where(eq(taskDependencies.dependentTaskId, taskId));

  return {
    taskId,
    prerequisites
  };
}

/**
 * Check if a task is blocked by incomplete dependencies
 */
export async function isTaskBlocked(taskId: string): Promise<boolean> {
  const chain = await getDependencyChain(taskId);
  return chain.prerequisites.some(p => !p.completed);
}

/**
 * Get all tasks blocked by a given task
 */
export async function getBlockedTasks(taskId: string): Promise<Task[]> {
  const blockedTasks = await db
    .select({
      task: tasks
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(taskDependencies.dependentTaskId, tasks.id))
    .where(eq(taskDependencies.prerequisiteTaskId, taskId));

  return blockedTasks.map(({ task }) => task);
}

/**
 * Calculate the earliest possible start date for a task based on its dependencies
 */
export async function calculateEarliestStartDate(taskId: string): Promise<Date | null> {
  const chain = await getDependencyChain(taskId);
  
  // If no prerequisites or none have due dates, return null (can start anytime)
  if (chain.prerequisites.length === 0 || !chain.prerequisites.some(p => p.dueDate)) {
    return null;
  }

  // Find the latest due date among prerequisites
  const latestDueDate = new Date(Math.max(
    ...chain.prerequisites
      .filter(p => p.dueDate)
      .map(p => p.dueDate!.getTime())
  ));

  // Add a small buffer (e.g., 1 hour) after the latest prerequisite
  return new Date(latestDueDate.getTime() + 60 * 60 * 1000);
}

/**
 * Validate task completion based on dependencies
 */
export async function canCompleteTask(taskId: string): Promise<{
  canComplete: boolean;
  reason?: string;
}> {
  const isBlocked = await isTaskBlocked(taskId);
  
  if (isBlocked) {
    return {
      canComplete: false,
      reason: 'Task has incomplete dependencies'
    };
  }

  return { canComplete: true };
}

/**
 * Add a dependency between two tasks
 */
export async function addDependency(
  dependentTaskId: string,
  prerequisiteTaskId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  // Check for circular dependency
  const wouldCreateCircular = await wouldCreateCircularDependency(
    dependentTaskId,
    prerequisiteTaskId
  );

  if (wouldCreateCircular) {
    return {
      success: false,
      error: 'Adding this dependency would create a circular reference'
    };
  }

  try {
    await db.insert(taskDependencies).values({
      dependentTaskId,
      prerequisiteTaskId,
      createdAt: new Date()
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to add dependency'
    };
  }
}

/**
 * Remove a dependency between two tasks
 */
export async function removeDependency(
  dependentTaskId: string,
  prerequisiteTaskId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await db
      .delete(taskDependencies)
      .where(
        and(
          eq(taskDependencies.dependentTaskId, dependentTaskId),
          eq(taskDependencies.prerequisiteTaskId, prerequisiteTaskId)
        )
      );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to remove dependency'
    };
  }
}

/**
 * Get suggested dependencies based on task relationships
 */
export async function suggestDependencies(taskId: string): Promise<Task[]> {
  const task = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task[0]) {
    return [];
  }

  // Find tasks in the same list with earlier due dates
  const potentialDependencies = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.listId, task[0].listId),
        sql`${tasks.dueDate} < ${task[0].dueDate}`,
        sql`${tasks.id} != ${taskId}`
      )
    )
    .orderBy(tasks.dueDate)
    .limit(5);

  return potentialDependencies;
} 