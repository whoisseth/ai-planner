/**
 * @file route.ts
 * @description API route handler for AI-powered tag suggestions
 */

import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { db } from '@/db';
import { tasks, tags } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { suggestTags } from '@/lib/ai/taskAI';
import type { Task } from '@/lib/ai/types';

/**
 * GET /api/ai/tag-suggestions
 * Get tag suggestions for a task
 */
export async function GET(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    
    if (!taskId) {
      return new NextResponse('Task ID is required', { status: 400 });
    }

    // Get task and existing tags
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });

    if (!task) {
      return new NextResponse('Task not found', { status: 404 });
    }

    const existingTags = await db.query.tags.findMany({
      where: eq(tags.userId, session.user.id)
    });

    // Convert DB task to AI Task type with all required fields
    const taskWithTags: Required<Task> = {
      ...task,
      tags: [], // Initialize with empty tags array
      completed: task.completed || false,
      description: task.description || '',
      settings: {
        tags: [],
        priority: task.priority || 'Medium',
        estimatedDuration: 0
      },
      completedAt: null
    };

    // Get tag suggestions
    const suggestions = await suggestTags(taskWithTags, existingTags, session.user.id);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error in tag suggestions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 