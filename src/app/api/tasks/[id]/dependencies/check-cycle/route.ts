// src/app/api/tasks/[id]/dependencies/check-cycle/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskDependencies } from "@/db/schema";
import { getCurrentUser } from "@/app/api/_lib/session";
import { and, eq } from "drizzle-orm";

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
    const { searchParams } = new URL(request.url);
    const dependencyId = searchParams.get("dependencyId");

    if (!dependencyId) {
      return new NextResponse("Missing dependencyId parameter", { status: 400 });
    }

    // Check if both tasks exist and belong to user
    const [task, dependencyTask] = await Promise.all([
      db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, taskId),
          eq(tasks.userId, user.id)
        ),
      }),
      db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, dependencyId),
          eq(tasks.userId, user.id)
        ),
      }),
    ]);

    if (!task || !dependencyTask) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Check for circular dependencies using a recursive function
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

    const hasCycle = await hasCycleDFS(dependencyId);
    return NextResponse.json({ hasCycle });
  } catch (error) {
    console.error("Failed to check dependency cycle:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 