// src/app/api/tags/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { getCurrentUser } from "@/app/api/_lib/session";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

// Schema for tag creation/update
const tagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const validatedData = tagSchema.parse(body);

    // Check if tag with same name exists for user
    const existingTag = await db.query.tags.findFirst({
      where: and(
        eq(tags.userId, user.id),
        eq(tags.name, validatedData.name)
      ),
    });

    if (existingTag) {
      return new NextResponse("Tag with this name already exists", { status: 400 });
    }

    const [tag] = await db
      .insert(tags)
      .values({
        id: nanoid(),
        userId: user.id,
        name: validatedData.name,
        color: validatedData.color,
      })
      .returning();

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Failed to create tag:", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userTags = await db.query.tags.findMany({
      where: and(
        eq(tags.userId, user.id),
        eq(tags.isDeleted, false)
      ),
      orderBy: (tags, { desc }) => [desc(tags.usageCount)],
    });

    return NextResponse.json(userTags);
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 