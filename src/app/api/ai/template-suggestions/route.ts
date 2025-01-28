/**
 * @file route.ts
 * @description API route handler for AI-powered template suggestions
 */

import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { db } from '@/db';
import { tasks, templates } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { suggestTemplates } from '@/lib/ai/taskAI';
import type { Task } from '@/lib/ai/types';

/**
 * GET /api/ai/template-suggestions
 * Get template suggestions for a task
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

    // Get task and templates
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });

    if (!task) {
      return new NextResponse('Task not found', { status: 404 });
    }

    const userTemplates = await db.query.templates.findMany({
      where: eq(templates.userId, session.user.id)
    });

    // Convert DB task to AI Task type with all required fields
    const taskWithTags: Task = {
      ...task,
      tags: [], // Initialize with empty tags if none exist
      completed: task.completed || false,
      description: task.description || null,
      settings: {
        tags: [],
        priority: task.priority || 'Medium',
        estimatedDuration: undefined
      },
      completedAt: null
    };

    // Get template suggestions
    const suggestions = await suggestTemplates(taskWithTags, userTemplates, session.user.id);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error in template suggestions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 