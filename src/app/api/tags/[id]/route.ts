// src/app/api/tags/[id]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { getCurrentUser } from "@/app/api/_lib/session";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

// Schema for tag updates
const updateTagSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateTagSchema.parse(body);

    // Check if tag exists and belongs to user
    const existingTag = await db.query.tags.findFirst({
      where: and(
        eq(tags.id, params.id),
        eq(tags.userId, user.id)
      ),
    });

    if (!existingTag) {
      return new NextResponse("Tag not found", { status: 404 });
    }

    // If name is being updated, check for duplicates
    if (validatedData.name && validatedData.name !== existingTag.name) {
      const duplicateTag = await db.query.tags.findFirst({
        where: and(
          eq(tags.userId, user.id),
          eq(tags.name, validatedData.name),
          eq(tags.isDeleted, false)
        ),
      });

      if (duplicateTag) {
        return new NextResponse("Tag with this name already exists", { status: 400 });
      }
    }

    const [updatedTag] = await db
      .update(tags)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(tags.id, params.id),
        eq(tags.userId, user.id)
      ))
      .returning();

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error("Failed to update tag:", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if tag exists and belongs to user
    const existingTag = await db.query.tags.findFirst({
      where: and(
        eq(tags.id, params.id),
        eq(tags.userId, user.id)
      ),
    });

    if (!existingTag) {
      return new NextResponse("Tag not found", { status: 404 });
    }

    // Soft delete the tag
    await db
      .update(tags)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
      })
      .where(and(
        eq(tags.id, params.id),
        eq(tags.userId, user.id)
      ));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete tag:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 