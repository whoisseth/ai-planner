/**
 * @file route.ts
 * @description API route handler for AI-powered dependency suggestions
 */

import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { suggestDependencies } from "@/lib/ai/dependencyAI";
import type { Task } from "@/lib/ai/types";

/**
 * GET /api/ai/dependency-suggestions
 * Get dependency suggestions for a task
 */
export async function GET(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return new NextResponse("Task ID is required", { status: 400 });
    }

    // Get task and other tasks
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    const otherTasks = await db.query.tasks.findMany({
      where: eq(tasks.userId, session.user.id),
    });

    // Convert DB tasks to AI Task type
    const taskWithTags: Task = {
      ...task,
      tags: [], // Initialize with empty tags if none exist
      completedAt: null,
    };

    const otherTasksWithTags: Task[] = otherTasks.map((t) => ({
      ...t,
      tags: [], // Initialize with empty tags if none exist
      completedAt: null,
    }));

    // Get dependency suggestions
    const suggestions = await suggestDependencies(
      taskWithTags,
      otherTasksWithTags,
      session.user.id,
    );

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error in dependency suggestions:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
