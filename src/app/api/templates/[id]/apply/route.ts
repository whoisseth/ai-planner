//api/templates/[id]/apply/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { templates, tasks, taskTags, tags } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TemplateSettings } from "@/services/templates";
import { sql } from "drizzle-orm";
import { addDays, addWeeks, addMonths, addYears, startOfDay } from "date-fns";

// Define literal types for task properties
type TaskType = "main" | "sub";
type Priority = "Low" | "Medium" | "High" | "Urgent";

/**
 * Calculate the next due date based on recurrence settings
 */
function calculateNextDueDate(
  baseDate: Date,
  recurrence: {
    frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    daysOfWeek?: number[];
    endDate?: number;
    count?: number;
  },
  currentCount: number = 0
): Date | null {
  const date = startOfDay(baseDate);
  
  // Check if we've reached the maximum count
  if (recurrence.count && currentCount >= recurrence.count) {
    return null;
  }

  // Check if we've reached the end date
  if (recurrence.endDate && date.getTime() >= recurrence.endDate) {
    return null;
  }

  // For weekly recurrence with specific days
  if (recurrence.frequency === 'weekly' && recurrence.daysOfWeek?.length) {
    const currentDay = date.getDay();
    const nextDays = recurrence.daysOfWeek.filter(day => day > currentDay);
    
    if (nextDays.length > 0) {
      // Get the next day in the current week
      const daysToAdd = nextDays[0] - currentDay;
      return addDays(date, daysToAdd);
    } else {
      // Move to the first specified day in the next week
      const daysToAdd = (7 - currentDay) + recurrence.daysOfWeek[0];
      return addDays(date, daysToAdd);
    }
  }
  
  // For other frequencies
  switch (recurrence.frequency) {
    case 'daily':
      return addDays(date, recurrence.interval);
    case 'weekly':
      return addWeeks(date, recurrence.interval);
    case 'monthly':
      return addMonths(date, recurrence.interval);
    case 'yearly':
      return addYears(date, recurrence.interval);
    default:
      return date;
  }
}

/**
 * Suggest a smart completion date based on template settings and current time
 */
function suggestCompletionDate(settings: TemplateSettings): Date | null {
  // If template has a specific due time, use that
  if (settings.reminder?.time) {
    return new Date(settings.reminder.time);
  }

  // If template has estimated duration, suggest a date based on that
  if (settings.estimatedDuration) {
    const suggestedDate = addDays(new Date(), Math.ceil(settings.estimatedDuration / (24 * 60)));
    return startOfDay(suggestedDate);
  }

  // Default to no suggestion
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");

    if (!listId) {
      return new NextResponse("Missing listId parameter", { status: 400 });
    }

    // Get the template
    const template = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.id, params.id),
          eq(templates.userId, user.id)
        )
      )
      .get();

    if (!template) {
      return new NextResponse("Template not found", { status: 404 });
    }

    const settings = template.settings as TemplateSettings;

    // Calculate suggested due date
    const suggestedDueDate = suggestCompletionDate(settings);

    // Create the main task
    const taskId = nanoid();
    const task = await db
      .insert(tasks)
      .values({
        id: taskId,
        userId: user.id,
        listId,
        title: settings.title || template.name,
        description: settings.description,
        priority: (settings.priority || "Medium") as Priority,
        completed: false,
        starred: false,
        type: "main" as TaskType,
        // Add reminder configuration if specified in template
        reminder: settings.reminder ? JSON.stringify(settings.reminder) : null,
        // Add due date if available
        dueDate: suggestedDueDate,
        // Add due time if specified in reminder
        dueTime: settings.reminder?.time ? new Date(settings.reminder.time).toLocaleTimeString() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
      .get();

    // Create subtasks if any
    if (settings.defaultSubtasks?.length) {
      // Define the type for subtask values to match the tasks table schema
      const subtaskValues = settings.defaultSubtasks.map((subtask) => ({
        id: nanoid(),
        userId: user.id,
        listId,
        title: subtask.title,
        description: subtask.description,
        completed: false,
        type: "sub" as TaskType,
        parentId: taskId,
        priority: "Medium" as Priority,
        starred: false,
        // Inherit reminder settings from parent task
        reminder: settings.reminder ? JSON.stringify(settings.reminder) : null,
        // Inherit due date and time from parent task
        dueDate: suggestedDueDate,
        dueTime: settings.reminder?.time ? new Date(settings.reminder.time).toLocaleTimeString() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(tasks).values(subtaskValues);
    }

    // Add tags if specified in template settings
    if (settings.tags?.length) {
      const tagValues = settings.tags.map(tagId => ({
        taskId,
        tagId,
        createdAt: new Date(),
      }));

      await db.insert(taskTags).values(tagValues);

      // Update usage count for each tag
      for (const tagId of settings.tags) {
        await db
          .update(tags)
          .set({
            usageCount: sql`usage_count + 1`,
            lastUsed: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(tags.id, tagId),
              eq(tags.userId, user.id)
            )
          );
      }
    }

    // If template has recurrence settings, schedule the next occurrence
    if (settings.reminder?.recurrence && settings.reminder.recurrence.frequency !== 'none') {
      const nextDueDate = calculateNextDueDate(
        suggestedDueDate || new Date(),
        settings.reminder.recurrence,
        1 // Start with count 1 since this is the first recurrence
      );

      if (nextDueDate) {
        // Create a new task for the next occurrence
        await db.insert(tasks).values({
          id: nanoid(),
          userId: user.id,
          listId,
          title: settings.title || template.name,
          description: settings.description,
          priority: (settings.priority || "Medium") as Priority,
          completed: false,
          starred: false,
          type: "main" as TaskType,
          reminder: settings.reminder ? JSON.stringify(settings.reminder) : null,
          dueDate: nextDueDate,
          dueTime: settings.reminder?.time ? new Date(settings.reminder.time).toLocaleTimeString() : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Update template usage count
    await db
      .update(templates)
      .set({
        usageCount: template.usageCount + 1,
        lastUsed: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(templates.id, template.id));

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error applying template:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 