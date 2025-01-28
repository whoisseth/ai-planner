/**
 * @file route.ts
 * @description API route handler for AI-powered productivity analysis
 */

import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  analyzeProductivityPatterns,
  generateProductivityInsights,
  identifyTaskChains
} from '@/lib/ai/userActivityAI';
import type { Task } from '@/lib/ai/types';

/**
 * POST /api/ai/productivity
 * Analyze user's productivity patterns
 */
export async function POST(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user's tasks
    const dbTasks = await db.query.tasks.findMany({
      where: eq(tasks.userId, session.user.id)
    });

    // Convert DB tasks to AI Task type
    const userTasks: Task[] = dbTasks.map(task => ({
      ...task,
      tags: [], // Initialize with empty tags if none exist
      completedAt: null // Initialize completedAt if not present
    }));

    // Analyze productivity patterns
    const patterns = await analyzeProductivityPatterns(userTasks);
    
    // Generate insights
    const insights = await generateProductivityInsights(userTasks, patterns);
    
    // Identify task chains
    const chains = await identifyTaskChains(userTasks);

    return NextResponse.json({
      patterns,
      insights,
      chains
    });
  } catch (error) {
    console.error('Error in productivity analysis:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 