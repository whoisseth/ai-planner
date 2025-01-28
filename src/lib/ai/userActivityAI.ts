/**
 * @file userActivityAI.ts
 * @description AI-powered features for analyzing user activity patterns and productivity insights
 */

import { CohereClient } from 'cohere-ai';
import { type Task } from './types';
import type { UserActivityMetrics, TaskCompletionMetrics } from './types';

// Initialize Cohere client
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY || '' });

/**
 * Interface for productivity insight
 */
interface ProductivityInsight {
  type: 'pattern' | 'suggestion' | 'warning';
  message: string;
  confidence: number;
  data?: Record<string, unknown>;
}

/**
 * Interface for task chain
 */
interface TaskChain {
  tasks: string[];
  frequency: number;
  averageGap: number;
  success_rate: number;
}

/**
 * Analyzes user's task completion patterns
 */
export async function analyzeTaskCompletionPatterns(
  tasks: Task[],
  timeframe: number = 30 // days
): Promise<TaskCompletionMetrics> {
  const completedTasks = tasks.filter(t => t.completed);
  const totalTasks = tasks.length;

  // Calculate completion times by hour
  const hourlyCompletions = new Map<number, number>();
  completedTasks.forEach(task => {
    if (task.completedAt) {
      const hour = new Date(task.completedAt).getHours();
      hourlyCompletions.set(hour, (hourlyCompletions.get(hour) || 0) + 1);
    }
  });

  // Calculate completion days
  const completionDays = new Map<number, number>();
  completedTasks.forEach(task => {
    if (task.completedAt) {
      const day = new Date(task.completedAt).getDay();
      completionDays.set(day, (completionDays.get(day) || 0) + 1);
    }
  });

  // Calculate average completion time
  const taskCompletionTimes = completedTasks
    .filter(task => task.completedAt && task.createdAt)
    .map(task => {
      const start = new Date(task.createdAt!).getTime();
      const end = new Date(task.completedAt!).getTime();
      return end - start;
    });

  const averageCompletionTime = taskCompletionTimes.length > 0
    ? taskCompletionTimes.reduce((a, b) => a + b, 0) / taskCompletionTimes.length
    : 0;

  return {
    averageCompletionTime,
    completionRate: totalTasks > 0 ? completedTasks.length / totalTasks : 0,
    commonCompletionTimes: Array.from(hourlyCompletions.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count),
    commonDaysOfWeek: Array.from(completionDays.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count)
  };
}

/**
 * Analyzes user's productivity patterns
 */
export async function analyzeProductivityPatterns(
  tasks: Task[],
  timeframe: number = 30
): Promise<UserActivityMetrics> {
  const completedTasks = tasks.filter(t => t.completed);
  
  // Analyze productive hours
  const hourlyCompletion = new Map<number, number>();
  completedTasks.forEach(task => {
    if (task.completedAt) {
      const hour = new Date(task.completedAt).getHours();
      hourlyCompletion.set(hour, (hourlyCompletion.get(hour) || 0) + 1);
    }
  });

  const mostProductiveHours = Array.from(hourlyCompletion.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hour]) => hour);

  // Analyze productive days
  const dailyCompletion = new Map<number, number>();
  completedTasks.forEach(task => {
    if (task.completedAt) {
      const day = new Date(task.completedAt).getDay();
      dailyCompletion.set(day, (dailyCompletion.get(day) || 0) + 1);
    }
  });

  const mostProductiveDays = Array.from(dailyCompletion.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([day]) => day);

  // Analyze task types
  const typeCount = new Map<string, number>();
  tasks.forEach(task => {
    typeCount.set(task.type, (typeCount.get(task.type) || 0) + 1);
  });

  // Analyze tag usage
  const tagMetrics = new Map<string, { count: number, totalTime: number }>();
  completedTasks.forEach(task => {
    if (!task.tags) return;
    
    const completionTime = task.completedAt && task.createdAt
      ? new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()
      : 0;

    task.tags.forEach(tag => {
      const metrics = tagMetrics.get(tag) || { count: 0, totalTime: 0 };
      metrics.count++;
      metrics.totalTime += completionTime;
      tagMetrics.set(tag, metrics);
    });
  });

  return {
    mostProductiveHours,
    mostProductiveDays,
    averageTasksPerDay: completedTasks.length / timeframe,
    preferredTaskTypes: Array.from(typeCount.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    tagUsagePatterns: Array.from(tagMetrics.entries())
      .map(([tag, metrics]) => ({
        tag,
        frequency: metrics.count,
        averageCompletionTime: metrics.count > 0 
          ? metrics.totalTime / metrics.count 
          : 0
      }))
      .sort((a, b) => b.frequency - a.frequency)
  };
}

/**
 * Identifies common task chains
 */
export async function identifyTaskChains(
  tasks: Task[],
  minFrequency: number = 2
): Promise<TaskChain[]> {
  const chains: TaskChain[] = [];
  const completedTasks = tasks
    .filter(t => t.completed && t.completedAt)
    .sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt) : new Date(0);
      const dateB = b.completedAt ? new Date(b.completedAt) : new Date(0);
      return dateA.getTime() - dateB.getTime();
    });

  // Find sequences of tasks that are commonly completed together
  for (let windowSize = 2; windowSize <= 5; windowSize++) {
    const sequences = new Map<string, {
      count: number;
      totalGap: number;
      successCount: number;
    }>();

    for (let i = 0; i <= completedTasks.length - windowSize; i++) {
      const sequence = completedTasks.slice(i, i + windowSize);
      const key = sequence.map(t => t.id).join(',');
      
      const gaps = sequence.slice(1).map((task, index) => {
        const prevTask = sequence[index];
        return task.completedAt && prevTask.completedAt
          ? new Date(task.completedAt).getTime() - new Date(prevTask.completedAt).getTime()
          : 0;
      });

      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const allCompleted = sequence.every(t => t.completed);

      const stats = sequences.get(key) || { count: 0, totalGap: 0, successCount: 0 };
      stats.count++;
      stats.totalGap += avgGap;
      if (allCompleted) stats.successCount++;
      sequences.set(key, stats);
    }

    // Add frequent sequences to chains
    sequences.forEach((stats, key) => {
      if (stats.count >= minFrequency) {
        chains.push({
          tasks: key.split(','),
          frequency: stats.count,
          averageGap: stats.totalGap / stats.count,
          success_rate: stats.successCount / stats.count
        });
      }
    });
  }

  return chains.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Generates productivity insights based on user patterns
 */
export async function generateProductivityInsights(
  tasks: Task[],
  metrics: UserActivityMetrics
): Promise<ProductivityInsight[]> {
  const insights: ProductivityInsight[] = [];

  // Analyze completion rate trends
  const recentTasks = tasks.filter(t => {
    const createdAt = t.createdAt ? new Date(t.createdAt) : null;
    return createdAt && createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  });

  const recentCompletionRate = recentTasks.filter(t => t.completed).length / recentTasks.length;
  const overallCompletionRate = tasks.filter(t => t.completed).length / tasks.length;

  if (recentCompletionRate < overallCompletionRate * 0.8) {
    insights.push({
      type: 'warning',
      message: 'Your task completion rate has decreased recently',
      confidence: 0.8,
      data: {
        recentRate: recentCompletionRate,
        overallRate: overallCompletionRate
      }
    });
  }

  // Analyze productive hours
  const offPeakTasks = tasks.filter(t => {
    if (!t.createdAt) return false;
    const hour = new Date(t.createdAt).getHours();
    return !metrics.mostProductiveHours.includes(hour);
  });

  if (offPeakTasks.length > tasks.length * 0.3) {
    insights.push({
      type: 'suggestion',
      message: 'Consider scheduling more tasks during your most productive hours',
      confidence: 0.7,
      data: {
        productiveHours: metrics.mostProductiveHours,
        offPeakTaskCount: offPeakTasks.length
      }
    });
  }

  // Analyze tag patterns
  const highCompletionTags = metrics.tagUsagePatterns
    .filter(p => p.averageCompletionTime < metrics.tagUsagePatterns.reduce(
      (avg, p) => avg + p.averageCompletionTime,
      0
    ) / metrics.tagUsagePatterns.length);

  if (highCompletionTags.length > 0) {
    insights.push({
      type: 'pattern',
      message: 'You complete tasks with certain tags more efficiently',
      confidence: 0.9,
      data: {
        efficientTags: highCompletionTags.map(t => t.tag)
      }
    });
  }

  return insights;
} 