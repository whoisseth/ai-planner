/**
 * @file types.ts
 * @description Shared type definitions for AI-powered features
 */

import { type Task as BaseTask } from '@/db/schema';

/**
 * Extended Task type with additional properties needed for AI features
 */
export interface Task extends Omit<BaseTask, 'description' | 'completed'> {
  id: string;
  title: string;
  tags: string[];
  completedAt?: Date | null;
  completed: boolean;
  description: string | null;
  settings?: {
    tags?: string[];
    estimatedDuration?: number;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    dueDate?: Date;
  };
}

/**
 * Template settings type
 */
export interface TemplateSettings {
  title?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  tags?: string[];
  reminder?: {
    time: Date;
    type: 'email' | 'push' | 'both';
    recurrence?: {
      frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
      interval: number;
      daysOfWeek?: number[];
      endDate?: Date;
      count?: number;
    };
  };
  estimatedDuration?: number;
  defaultSubtasks?: Array<{
    title: string;
    description?: string;
  }>;
}

/**
 * Task completion metrics
 */
export interface TaskCompletionMetrics {
  averageCompletionTime: number;
  completionRate: number;
  commonCompletionTimes: {
    hour: number;
    count: number;
  }[];
  commonDaysOfWeek: {
    day: number;
    count: number;
  }[];
}

/**
 * User activity metrics
 */
export interface UserActivityMetrics {
  mostProductiveHours: number[];
  mostProductiveDays: number[];
  averageTasksPerDay: number;
  preferredTaskTypes: {
    type: string;
    count: number;
  }[];
  tagUsagePatterns: {
    tag: string;
    frequency: number;
    averageCompletionTime: number;
  }[];
} 