// src/app/api/tasks/[id]/tags/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { taskTags, tags, tasks } from "@/db/schema";
import { getCurrentUser } from "@/app/api/_lib/session";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Schema for updating task tags
const updateTaskTagsSchema = z.object({
  tagIds: z.array(z.string()),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if task exists and belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, params.id),
        eq(tasks.userId, user.id)
      ),
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Get all tags for the task
    const taskTagsResult = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(taskTags)
      .innerJoin(tags, eq(tags.id, taskTags.tagId))
      .where(and(
        eq(taskTags.taskId, params.id),
        eq(tags.isDeleted, false)
      ));

    return NextResponse.json(taskTagsResult);
  } catch (error) {
    console.error("Failed to fetch task tags:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { tagIds } = updateTaskTagsSchema.parse(body);

    // Check if task exists and belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, params.id),
        eq(tasks.userId, user.id)
      ),
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Verify all tags exist and belong to user
    if (tagIds.length > 0) {
      const validTags = await db.query.tags.findMany({
        where: and(
          inArray(tags.id, tagIds),
          eq(tags.userId, user.id),
          eq(tags.isDeleted, false)
        ),
      });

      if (validTags.length !== tagIds.length) {
        return new NextResponse("One or more tags are invalid", { status: 400 });
      }
    }

    // Start a transaction
    await db.transaction(async (tx) => {
      // Delete existing task tags
      await tx
        .delete(taskTags)
        .where(eq(taskTags.taskId, params.id));

      // Insert new task tags
      if (tagIds.length > 0) {
        await tx
          .insert(taskTags)
          .values(
            tagIds.map((tagId) => ({
              taskId: params.id,
              tagId,
            }))
          );

        // Update tag usage counts
        await Promise.all(
          tagIds.map((tagId) =>
            tx
              .update(tags)
              .set({
                usageCount: sql`${tags.usageCount} + 1`,
                lastUsed: new Date(),
              })
              .where(eq(tags.id, tagId))
          )
        );
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to update task tags:", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 