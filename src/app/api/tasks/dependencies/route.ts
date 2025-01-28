import { NextResponse } from "next/server";
import { db } from "@/db";
import { taskDependencies, tasks } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

// Schema for dependency request
const dependencySchema = z.object({
  dependentTaskId: z.string(),
  prerequisiteTaskId: z.string(),
});

// Check for circular dependencies
async function hasCircularDependency(
  dependentTaskId: string,
  prerequisiteTaskId: string,
  visited = new Set<string>()
): Promise<boolean> {
  if (visited.has(prerequisiteTaskId)) {
    return true;
  }

  visited.add(prerequisiteTaskId);

  const dependencies = await db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.dependentTaskId, prerequisiteTaskId));

  for (const dep of dependencies) {
    if (
      dep.prerequisiteTaskId === dependentTaskId ||
      (await hasCircularDependency(dependentTaskId, dep.prerequisiteTaskId, visited))
    ) {
      return true;
    }
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { dependentTaskId, prerequisiteTaskId } = dependencySchema.parse(body);

    // Verify both tasks exist and belong to the user
    const [dependentTask, prerequisiteTask] = await Promise.all([
      db.select().from(tasks).where(and(
        eq(tasks.id, dependentTaskId),
        eq(tasks.userId, user.id)
      )).get(),
      db.select().from(tasks).where(and(
        eq(tasks.id, prerequisiteTaskId),
        eq(tasks.userId, user.id)
      )).get(),
    ]);

    if (!dependentTask || !prerequisiteTask) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Check for self-dependency
    if (dependentTaskId === prerequisiteTaskId) {
      return new NextResponse("Task cannot depend on itself", { status: 400 });
    }

    // Check for circular dependencies
    if (await hasCircularDependency(dependentTaskId, prerequisiteTaskId)) {
      return new NextResponse("Circular dependency detected", { status: 400 });
    }

    // Create dependency
    const dependency = await db
      .insert(taskDependencies)
      .values({
        dependentTaskId,
        prerequisiteTaskId,
      })
      .returning()
      .get();

    return NextResponse.json(dependency);
  } catch (error) {
    console.error("Error creating task dependency:", error);
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dependentTaskId = searchParams.get("dependentTaskId");
    const prerequisiteTaskId = searchParams.get("prerequisiteTaskId");

    if (!dependentTaskId || !prerequisiteTaskId) {
      return new NextResponse("Missing required parameters", { status: 400 });
    }

    // Verify tasks belong to user
    const [dependentTask, prerequisiteTask] = await Promise.all([
      db.select().from(tasks).where(and(
        eq(tasks.id, dependentTaskId),
        eq(tasks.userId, user.id)
      )).get(),
      db.select().from(tasks).where(and(
        eq(tasks.id, prerequisiteTaskId),
        eq(tasks.userId, user.id)
      )).get(),
    ]);

    if (!dependentTask || !prerequisiteTask) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Delete dependency
    await db
      .delete(taskDependencies)
      .where(
        and(
          eq(taskDependencies.dependentTaskId, dependentTaskId),
          eq(taskDependencies.prerequisiteTaskId, prerequisiteTaskId)
        )
      );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting task dependency:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return new NextResponse("Missing taskId parameter", { status: 400 });
    }

    // Verify task belongs to user
    const task = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
      .get();

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Get dependencies (tasks that this task depends on)
    const dependencies = await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.dependentTaskId, taskId));

    // Get dependents (tasks that depend on this task)
    const dependents = await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.prerequisiteTaskId, taskId));

    return NextResponse.json({
      dependencies,
      dependents,
    });
  } catch (error) {
    console.error("Error getting task dependencies:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 