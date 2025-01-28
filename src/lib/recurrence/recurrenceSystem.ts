import { Task } from '@/db/schema';
import { addDays, addMonths, addWeeks, addYears, setHours, setMinutes } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];  // 0 = Sunday, 1 = Monday, etc.
  endDate?: Date;
  count?: number;
  timezone: string;
}

export interface RecurrenceInstance {
  taskId: string;
  originalTaskId: string;
  instanceDate: Date;
  completed: boolean;
}

/**
 * Calculate the next occurrence of a recurring task
 */
export function calculateNextOccurrence(
  lastDate: Date,
  pattern: RecurrencePattern,
  skipWeekends: boolean = false
): Date | null {
  // Convert to user's timezone for calculations
  const zonedDate = toZonedTime(lastDate, pattern.timezone);
  let nextDate: Date;

  switch (pattern.frequency) {
    case 'daily':
      nextDate = addDays(zonedDate, pattern.interval);
      break;
    case 'weekly':
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        // Find next matching day of week
        const currentDayOfWeek = zonedDate.getDay();
        const nextDayOfWeek = pattern.daysOfWeek.find(day => day > currentDayOfWeek);
        if (nextDayOfWeek !== undefined) {
          // Next day is in the same week
          nextDate = addDays(zonedDate, nextDayOfWeek - currentDayOfWeek);
        } else {
          // Move to first day of next week
          nextDate = addDays(zonedDate, 7 - currentDayOfWeek + pattern.daysOfWeek[0]);
        }
      } else {
        nextDate = addWeeks(zonedDate, pattern.interval);
      }
      break;
    case 'monthly':
      nextDate = addMonths(zonedDate, pattern.interval);
      break;
    case 'yearly':
      nextDate = addYears(zonedDate, pattern.interval);
      break;
    default:
      return null;
  }

  // Skip weekends if required
  if (skipWeekends) {
    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate = addDays(nextDate, 1);
    }
  }

  // Check if we've reached the end conditions
  if (pattern.endDate && nextDate > pattern.endDate) {
    return null;
  }

  // Convert back to UTC for storage
  return new Date(formatInTimeZone(nextDate, pattern.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"));
}

/**
 * Generate the next N occurrences of a recurring task
 */
export function generateNextOccurrences(
  startDate: Date,
  pattern: RecurrencePattern,
  count: number,
  skipWeekends: boolean = false
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = startDate;

  while (occurrences.length < count) {
    const nextDate = calculateNextOccurrence(currentDate, pattern, skipWeekends);
    if (!nextDate) break;

    occurrences.push(nextDate);
    currentDate = nextDate;
  }

  return occurrences;
}

/**
 * Create a recurring task instance
 */
export function createRecurringInstance(
  task: Task,
  instanceDate: Date,
  pattern: RecurrencePattern
): Omit<Task, 'id'> {
  // Convert the instance date to user's timezone
  const zonedDate = toZonedTime(instanceDate, pattern.timezone);

  // If the original task had a specific time, apply it to the new instance
  let dueTime = task.dueTime;
  if (dueTime) {
    const [hours, minutes] = dueTime.split(':').map(Number);
    zonedDate.setHours(hours, minutes);
  }

  // Convert back to UTC for storage
  const utcDate = new Date(formatInTimeZone(zonedDate, pattern.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"));

  return {
    ...task,
    dueDate: utcDate,
    dueTime: task.dueTime,
    completed: false,
    parentId: task.id, // Link to original task
    type: 'sub' as const // Use sub type for recurring instances
  };
}

/**
 * Check if a recurring task needs new instances
 */
export function needsNewInstances(
  task: Task,
  pattern: RecurrencePattern,
  existingInstances: RecurrenceInstance[]
): boolean {
  if (!task.dueDate) return false;

  const lastInstance = existingInstances
    .sort((a, b) => b.instanceDate.getTime() - a.instanceDate.getTime())[0];

  if (!lastInstance) return true;

  // Check if we need more instances based on pattern
  const nextDate = calculateNextOccurrence(lastInstance.instanceDate, pattern);
  if (!nextDate) return false;

  // Generate instances up to 2 months in advance
  const twoMonthsFromNow = addMonths(new Date(), 2);
  return nextDate <= twoMonthsFromNow;
}

/**
 * Update recurring task instances after a change
 */
export function updateRecurringInstances(
  task: Task,
  pattern: RecurrencePattern,
  instances: RecurrenceInstance[],
  changes: Partial<Task>
): Partial<Task>[] {
  return instances.map(instance => {
    // Don't update completed instances
    if (instance.completed) return {};

    // Update future instances with relevant changes
    const instanceDate = instance.instanceDate;
    if (instanceDate > new Date()) {
      return {
        ...changes,
        dueDate: instanceDate, // Preserve the instance's date
        parentId: task.id
      };
    }

    return {};
  }).filter(update => Object.keys(update).length > 0);
}

/**
 * Validate a recurrence pattern
 */
export function validateRecurrencePattern(pattern: RecurrencePattern): string[] {
  const errors: string[] = [];

  if (!pattern.frequency) {
    errors.push('Frequency is required');
  }

  if (!pattern.interval || pattern.interval < 1) {
    errors.push('Interval must be at least 1');
  }

  if (pattern.frequency === 'weekly' && (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0)) {
    errors.push('Days of week are required for weekly recurrence');
  }

  if (pattern.endDate && pattern.endDate < new Date()) {
    errors.push('End date cannot be in the past');
  }

  if (pattern.count !== undefined && pattern.count < 1) {
    errors.push('Count must be at least 1');
  }

  if (!pattern.timezone) {
    errors.push('Timezone is required');
  }

  return errors;
} 