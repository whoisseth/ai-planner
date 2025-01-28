import { NextResponse } from "next/server";
import { db } from "@/db";
import { templates } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

// Schema for template settings
const templateSettingsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  tags: z.array(z.string()).optional(),
  reminder: z.object({
    time: z.number().optional(),
    type: z.enum(["email", "push", "both"]).optional(),
    recurrence: z.object({
      frequency: z.enum(["none", "daily", "weekly", "monthly", "yearly"]),
      interval: z.number(),
      daysOfWeek: z.array(z.number()).optional(),
      endDate: z.number().optional(),
      count: z.number().optional(),
    }).optional(),
  }).optional(),
  estimatedDuration: z.number().optional(),
  defaultSubtasks: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
  })).optional(),
});

// Schema for template creation/update
const templateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  settings: templateSettingsSchema,
  isPublic: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, description, settings, isPublic } = templateSchema.parse(body);

    const template = await db
      .insert(templates)
      .values({
        id: nanoid(),
        userId: user.id,
        name,
        description,
        settings,
        isPublic: isPublic || false,
        usageCount: 0,
      })
      .returning()
      .get();

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
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

    const { searchParams } = new URL(req.url);
    const includePublic = searchParams.get("includePublic") === "true";

    let query = db
      .select()
      .from(templates)
      .where(eq(templates.userId, user.id));

    if (includePublic) {
      query = db
        .select()
        .from(templates)
        .where(
          and(
            eq(templates.isPublic, true),
            eq(templates.userId, user.id)
          )
        );
    }

    const templateList = await query;
    return NextResponse.json(templateList);
  } catch (error) {
    console.error("Error getting templates:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return new NextResponse("Missing template ID", { status: 400 });
    }

    const body = await req.json();
    const { name, description, settings, isPublic } = templateSchema.parse(body);

    const template = await db
      .update(templates)
      .set({
        name,
        description,
        settings,
        isPublic: isPublic || false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(templates.id, templateId),
          eq(templates.userId, user.id)
        )
      )
      .returning()
      .get();

    if (!template) {
      return new NextResponse("Template not found", { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error updating template:", error);
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
    const templateId = searchParams.get("id");

    if (!templateId) {
      return new NextResponse("Missing template ID", { status: 400 });
    }

    await db
      .delete(templates)
      .where(
        and(
          eq(templates.id, templateId),
          eq(templates.userId, user.id)
        )
      );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting template:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 