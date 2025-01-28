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
  calculateOptimalReminderTime,
  analyzeDependencyNotification,
  generateNotificationContent,
  analyzeNotificationPatterns
} from '@/lib/ai/notificationAI';
import type { Task } from '@/lib/ai/types';

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

    const userNotifications = await db.query.notifications.findMany({
      where: eq(notifications.userId, session.user.id)
    });

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
 * POST /api/ai/notifications/content
 * Generate personalized notification content
 */
export async function generateContent(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { taskId, type } = await request.json();
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

    // Generate notification content
    const content = await generateNotificationContent(
      taskWithAI,
      type,
      session.user.id
    );

    return NextResponse.json(content);
  } catch (error) {
    console.error('Error generating notification content:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 