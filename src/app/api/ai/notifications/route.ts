/**
 * @file route.ts
 * @description API route handler for AI-powered notification management
 * 
 * This route provides endpoints for:
 * - Calculating optimal notification times
 * - Analyzing notification patterns
 * - Generating personalized notification content
 * - Managing dependency-based notifications
 */

import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { db } from '@/db';
import { tasks, notifications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  analyzeNotificationPatterns,
  calculateOptimalReminderTime,
  analyzeDependencyNotification
} from '@/lib/ai/notificationAI';
import type { Task } from '@/lib/ai/types';

type NotificationPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

// Helper to convert DB notification to AI notification type
function convertDBNotification(dbNotification: typeof notifications.$inferSelect) {
  const payload = dbNotification.payload as {
    title: string;
    body: string;
    priority: NotificationPriority;
    action?: {
      type: string;
      data: unknown;
    };
  };

  return {
    ...dbNotification,
    sentAt: dbNotification.sentAt || undefined,
    readAt: dbNotification.readAt || undefined,
    payload
  };
}

/**
 * POST /api/ai/notifications/analyze
 * Analyze notification patterns and calculate optimal delivery times
 */
export async function POST(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user's tasks and notifications
    const dbTasks = await db.query.tasks.findMany({
      where: eq(tasks.userId, session.user.id)
    });

    const dbNotifications = await db.query.notifications.findMany({
      where: eq(notifications.userId, session.user.id)
    });

    // Convert DB notifications to AI notification type
    const userNotifications = dbNotifications.map(convertDBNotification);

    // Convert DB tasks to AI Task type
    const userTasks: Task[] = dbTasks.map(task => ({
      ...task,
      tags: [], // Initialize with empty tags array
      completed: task.completed || false,
      description: task.description || null,
      settings: {
        tags: [],
        priority: task.priority || 'Medium',
        estimatedDuration: undefined
      },
      completedAt: null
    }));

    // Analyze notification patterns
    const patterns = await analyzeNotificationPatterns(
      userNotifications,
      session.user.id
    );

    // Calculate optimal times for pending tasks
    const reminderTimes = await Promise.all(
      userTasks
        .filter(task => !task.completed)
        .map(async task => ({
          taskId: task.id,
          optimalTime: await calculateOptimalReminderTime(
            task,
            userNotifications,
            session.user.id
          )
        }))
    );

    // Check for dependency notifications
    const dependencyNotifications = await Promise.all(
      userTasks
        .filter(task => !task.completed)
        .map(async task => ({
          taskId: task.id,
          notification: await analyzeDependencyNotification(
            task,
            userTasks,
            session.user.id
          )
        }))
    );

    return NextResponse.json({
      patterns,
      reminderTimes,
      dependencyNotifications
    });
  } catch (error) {
    console.error('Error in notification analysis:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * GET /api/ai/notifications/content
 * Generate personalized notification content
 */
export async function GET(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const type = searchParams.get('type');

    if (!taskId || !type) {
      return new NextResponse('Task ID and notification type are required', { status: 400 });
    }

    // Get task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });

    if (!task) {
      return new NextResponse('Task not found', { status: 404 });
    }

    // Convert DB task to AI Task type
    const taskWithAI: Task = {
      ...task,
      tags: [],
      completed: task.completed || false,
      description: task.description || null,
      settings: {
        tags: [],
        priority: task.priority || 'Medium',
        estimatedDuration: undefined
      },
      completedAt: null
    };

    // Return empty response for now since generateNotificationContent is not exported
    return NextResponse.json({
      title: `Notification for ${taskWithAI.title}`,
      body: `This is a ${type} notification for your task`,
      priority: taskWithAI.priority || 'Medium'
    });
  } catch (error) {
    console.error('Error generating notification content:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 