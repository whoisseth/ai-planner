// src/app/api/tasks/[id]/dependencies/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskDependencies } from "@/db/schema";
import { getCurrentUser } from "@/app/api/_lib/session";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

// Schema for updating task dependencies
const updateDependenciesSchema = z.object({
  dependencyIds: z.array(z.string()),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: taskId } = await context.params;

    // Check if task exists and belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, user.id)
      ),
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Get all dependencies for the task
    const dependencies = await db
      .select({
        prerequisiteTaskId: taskDependencies.prerequisiteTaskId,
      })
      .from(taskDependencies)
      .where(eq(taskDependencies.dependentTaskId, taskId));

    return NextResponse.json(dependencies.map(d => d.prerequisiteTaskId));
  } catch (error) {
    console.error("Failed to fetch task dependencies:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: taskId } = await context.params;
    const body = await request.json();
    const { dependencyIds } = updateDependenciesSchema.parse(body);

    // Check if task exists and belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, user.id)
      ),
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Verify all dependency tasks exist and belong to user
    if (dependencyIds.length > 0) {
      const validTasks = await db.query.tasks.findMany({
        where: and(
          inArray(tasks.id, dependencyIds),
          eq(tasks.userId, user.id)
        ),
      });

      if (validTasks.length !== dependencyIds.length) {
        return new NextResponse("One or more tasks are invalid", { status: 400 });
      }
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const stack = new Set<string>();

    async function hasCycleDFS(currentTaskId: string): Promise<boolean> {
      if (stack.has(currentTaskId)) {
        return true; // Found a cycle
      }
      if (visited.has(currentTaskId)) {
        return false; // Already checked this path
      }

      visited.add(currentTaskId);
      stack.add(currentTaskId);

      const dependencies = await db
        .select({
          prerequisiteTaskId: taskDependencies.prerequisiteTaskId,
        })
        .from(taskDependencies)
        .where(eq(taskDependencies.dependentTaskId, currentTaskId));

      for (const dep of dependencies) {
        if (await hasCycleDFS(dep.prerequisiteTaskId)) {
          return true;
        }
      }

      stack.delete(currentTaskId);
      return false;
    }

    // Check each new dependency for cycles
    for (const dependencyId of dependencyIds) {
      const hasCycle = await hasCycleDFS(dependencyId);
      if (hasCycle) {
        return new NextResponse(
          "Cannot add dependency: would create circular dependency",
          { status: 400 }
        );
      }
    }

    // Start a transaction
    await db.transaction(async (tx) => {
      // Delete existing dependencies
      await tx
        .delete(taskDependencies)
        .where(eq(taskDependencies.dependentTaskId, taskId));

      // Insert new dependencies
      if (dependencyIds.length > 0) {
        await tx
          .insert(taskDependencies)
          .values(
            dependencyIds.map((prerequisiteTaskId) => ({
              dependentTaskId: taskId,
              prerequisiteTaskId,
            }))
          );
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to update task dependencies:", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 