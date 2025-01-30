import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, lists } from "@/db/schema";
import { getCurrentUser } from "@/app/api/_lib/session";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

// Schema for task creation
const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullish(),
  listId: z.string().min(1, "List ID is required"),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  dueDate: z.string().nullish(),
  dueTime: z.string().nullish(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validatedData = createTaskSchema.parse(body);

    // Verify list exists and belongs to user
    const list = await db
      .select()
      .from(lists)
      .where(and(eq(lists.id, validatedData.listId), eq(lists.userId, String(user.id))))
      .get();

    if (!list) {
      return new NextResponse("List not found or unauthorized", { status: 404 });
    }

    const now = new Date();
    const taskId = nanoid();

    const task = await db
      .insert(tasks)
      .values({
        id: taskId,
        userId: String(user.id),
        listId: validatedData.listId,
        type: "main",
        title: validatedData.title,
        description: validatedData.description || null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        dueTime: validatedData.dueTime || null,
        priority: validatedData.priority || "Medium",
        completed: false,
        starred: false,
        sortOrder: 0,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, String(user.id)), eq(tasks.isDeleted, false)))
      .all();

    return NextResponse.json(userTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 
