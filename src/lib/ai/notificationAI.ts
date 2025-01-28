/**
 * @file notificationAI.ts
 * @description AI-powered notification system for intelligent task notifications
 * 
 * This module provides smart notification features including:
 * - Contextual bundling of related notifications
 * - Intelligent timing based on user patterns
 * - Adaptive delivery across multiple channels
 * - Priority-based notification scheduling
 */

import { CohereClient } from 'cohere-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import type { Task } from './types';

// Initialize Cohere client for content analysis
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || ''
});

// Initialize Pinecone client
const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || ''
});

type NotificationType = 
  | 'reminder'
  | 'dependency_blocked'
  | 'dependency_unblocked'
  | 'task_completed'
  | 'due_soon';

type NotificationPriority = NonNullable<NonNullable<Task['settings']>['priority']>;

interface Notification {
  id: string;
  userId: string;
  taskId: string;
  type: string;
  status: 'pending' | 'sent' | 'read' | 'failed';
  channel: 'email' | 'push' | 'both';
  scheduledFor: Date;
  sentAt?: Date;
  readAt?: Date;
  payload: {
    title: string;
    body: string;
    priority: NotificationPriority;
    action?: {
      type: string;
      data: unknown;
    };
  };
}

interface NotificationChannel {
  type: 'email' | 'push' | 'in-app';
  enabled: boolean;
  quietHours?: {
    start: number;  // Hour in 24-hour format
    end: number;    // Hour in 24-hour format
  };
}

interface UserNotificationPreferences {
  channels: NotificationChannel[];
  frequency: 'immediate' | 'batched' | 'daily';
  timezone: string;
  maxNotificationsPerDay?: number;
  quietHours?: {
    start: number;
    end: number;
  };
}

interface NotificationDeliveryStats {
  channel: string;
  deliveryRate: number;
  responseRate: number;
  engagementScore: number;
  failureCount: number;
}

interface UserActivityPattern {
  activeHours: number[];
  activeDays: number[];
  deviceUsage: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  responseLatency: {
    email: number;
    push: number;
    inApp: number;
  };
  quietHours: {
    start: number;
    end: number;
  };
}

interface PendingNotification {
  taskId: string;
  type: NotificationType;
  content: string;
  priority: NotificationPriority;
}

interface NotificationContent {
  title: string;
  body: string;
  priority: NotificationPriority;
}

/**
 * Interface for notification effectiveness metrics
 */
export interface NotificationMetrics {
  readRate: number;
  responseTime: number;
  channelEffectiveness: {
    email: number;
    push: number;
  };
}

/**
 * Interface for Pinecone match result
 */
interface PineconeMatch {
  id: string;
  score?: number;
  metadata?: Record<string, unknown>;
  values?: number[];
}

/**
 * Convert task priority to notification priority
 */
function mapTaskPriority(priority: NotificationPriority): NotificationPriority {
  return priority;
}

/**
 * Generate notification content
 */
async function generateNotificationContent(
  task: Task,
  type: NotificationType
): Promise<NotificationContent> {
  let baseContent = '';

  switch (type) {
    case 'reminder':
      baseContent = `Reminder: "${task.title}" needs attention`;
      break;
    case 'dependency_blocked':
      baseContent = `Task "${task.title}" is blocked by incomplete dependencies`;
      break;
    case 'dependency_unblocked':
      baseContent = `Good news! All dependencies for "${task.title}" are now complete`;
      break;
    case 'task_completed':
      baseContent = `Task "${task.title}" has been marked as complete`;
      break;
    case 'due_soon':
      baseContent = `Task "${task.title}" is due in the next 24 hours`;
      break;
  }

  // Add task details if available
  if (task.description) {
    baseContent += `\nDetails: ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`;
  }

  const taskPriority = task.settings?.priority || 'Medium';
  const priority = mapTaskPriority(taskPriority);

  return {
    title: 'Task Notification',
    body: baseContent,
    priority
  };
}

/**
 * Process and schedule notifications
 */
export async function processNotifications(
  tasks: Task[],
  userPatterns: UserActivityPattern,
  preferences: UserNotificationPreferences,
  deliveryStats: NotificationDeliveryStats[]
): Promise<Array<{
  taskId: string;
  content: string;
  scheduledTime: Date;
  channel: NotificationChannel['type'];
  priority: NotificationPriority;
  bundleId?: string;
}>> {
  // Generate initial notifications
  const pendingNotifications = await Promise.all(
    tasks.map(async task => {
      const type = determineNotificationType(task);
      const content = await generateNotificationContent(task, type);
      return {
        taskId: task.id,
        type,
        content: `${content.title}\n${content.body}`,
        priority: content.priority
      } satisfies PendingNotification;
    })
  );

  // Bundle related notifications
  const bundles = await bundleRelatedNotifications(pendingNotifications);

  // Schedule notifications
  const scheduledNotifications = await Promise.all(bundles.flatMap(async bundle => {
    const scheduledTime = await calculateOptimalNotificationTime(
      tasks.find(t => t.id === bundle.notifications[0].taskId)!,
      userPatterns,
      preferences
    );

    const channel = selectOptimalChannel(userPatterns, preferences, deliveryStats);

    return bundle.notifications.map(notification => ({
      taskId: notification.taskId,
      content: notification.content,
      scheduledTime,
      channel,
      priority: bundle.priority,
      bundleId: bundle.notifications.length > 1 ? `bundle-${bundle.context.substring(0, 8)}` : undefined
    }));
  }));

  return scheduledNotifications.flat();
}

/**
 * Generates embeddings for notification content
 */
async function generateNotificationEmbedding(notification: Notification): Promise<number[]> {
  const content = `${notification.type} ${JSON.stringify(notification.payload)}`;
  const response = await cohere.embed({
    texts: [content],
    model: 'embed-english-v3.0'
  });
  
  const embeddings = response.embeddings;
  if (!embeddings || !Array.isArray(embeddings) || embeddings.length === 0) {
    throw new Error('Failed to generate embeddings');
  }
  
  const firstEmbedding = embeddings[0];
  if (!Array.isArray(firstEmbedding)) {
    throw new Error('Invalid embedding format');
  }
  
  return firstEmbedding;
}

/**
 * Finds similar notifications for smart bundling
 */
export async function findSimilarNotifications(
  notification: Notification,
  userId: string,
  threshold: number = 0.85
): Promise<Notification[]> {
  const embedding = await generateNotificationEmbedding(notification);
  const index = pineconeClient.index('notifications');
  
  const queryResponse = await index.query({
    vector: embedding,
    topK: 5,
    filter: {
      userId: { $eq: userId },
      status: { $eq: 'pending' }
    },
    includeMetadata: true
  });

  return (queryResponse.matches || [])
    .filter((match: PineconeMatch): match is PineconeMatch & { score: number } => 
      typeof match.score === 'number' && match.score > threshold)
    .map(match => match.metadata as unknown as Notification);
}

/**
 * Determines the optimal delivery time based on user activity patterns
 */
export async function getOptimalDeliveryTime(
  userId: string,
  notification: Notification,
  activityPattern: UserActivityPattern
): Promise<Date> {
  const now = new Date();
  const userHour = now.getHours();
  
  // Don't deliver during quiet hours
  if (
    userHour >= activityPattern.quietHours.start ||
    userHour < activityPattern.quietHours.end
  ) {
    // Schedule for the end of quiet hours
    const nextDelivery = new Date();
    nextDelivery.setHours(activityPattern.quietHours.end, 0, 0, 0);
    if (nextDelivery < now) {
      nextDelivery.setDate(nextDelivery.getDate() + 1);
    }
    return nextDelivery;
  }

  // Find the next active hour
  const activeHours = activityPattern.activeHours.sort((a, b) => a - b);
  const nextActiveHour = activeHours.find(hour => hour > userHour) || activeHours[0];
  
  const deliveryTime = new Date();
  deliveryTime.setHours(nextActiveHour, 0, 0, 0);
  if (deliveryTime < now) {
    deliveryTime.setDate(deliveryTime.getDate() + 1);
  }

  return deliveryTime;
}

/**
 * Determines the best channel for notification delivery based on effectiveness metrics
 */
export function getBestDeliveryChannel(metrics: NotificationMetrics): 'email' | 'push' | 'both' {
  const { email, push } = metrics.channelEffectiveness;
  
  if (email > 0.7 && push > 0.7) {
    return 'both';
  }
  
  if (email > push) {
    return 'email';
  }
  
  return 'push';
}

/**
 * Analyzes notification content for priority determination
 */
export async function analyzeNotificationPriority(
  notification: Notification
): Promise<'high' | 'medium' | 'low'> {
  const content = `${notification.type} ${JSON.stringify(notification.payload)}`;
  
  const response = await cohere.classify({
    inputs: [content],
    examples: [
      { text: "reminder due_soon urgent task", label: "high" },
      { text: "dependency_blocked critical path", label: "high" },
      { text: "task_assigned normal priority", label: "medium" },
      { text: "reminder weekly routine", label: "low" }
    ]
  });

  if (!response.classifications?.[0]?.prediction) {
    throw new Error('Failed to analyze notification priority');
  }

  return response.classifications[0].prediction as 'high' | 'medium' | 'low';
}

/**
 * Updates user engagement metrics based on notification interaction
 */
export async function updateEngagementMetrics(
  notification: Notification,
  metrics: NotificationMetrics
): Promise<NotificationMetrics> {
  const wasRead = notification.status === 'read';
  const responseTime = notification.readAt && notification.sentAt
    ? new Date(notification.readAt).getTime() - new Date(notification.sentAt).getTime()
    : 0;

  return {
    readRate: (metrics.readRate * 0.9) + (wasRead ? 0.1 : 0),
    responseTime: responseTime > 0
      ? (metrics.responseTime * 0.9) + (responseTime * 0.1)
      : metrics.responseTime,
    channelEffectiveness: {
      email: notification.channel === 'email' || notification.channel === 'both'
        ? (metrics.channelEffectiveness.email * 0.9) + (wasRead ? 0.1 : 0)
        : metrics.channelEffectiveness.email,
      push: notification.channel === 'push' || notification.channel === 'both'
        ? (metrics.channelEffectiveness.push * 0.9) + (wasRead ? 0.1 : 0)
        : metrics.channelEffectiveness.push
    }
  };
}

/**
 * Calculate the optimal reminder time for a task based on user patterns
 * @param task The task to analyze
 * @param userNotifications Previous user notifications and their effectiveness
 * @param userId The user's ID
 * @returns Optimal reminder time as Date
 */
export async function calculateOptimalReminderTime(
  task: Task,
  userNotifications: Notification[],
  userId: string
): Promise<Date> {
  // TODO: Implement reminder time optimization based on:
  // - User's typical response times to notifications
  // - Task priority and due date
  // - Historical completion patterns
  // - Time of day effectiveness
  return new Date();
}

/**
 * Determine if a dependency-related notification should be sent
 * @param task The task to check
 * @param dependencyTasks Related dependency tasks
 * @param userId The user's ID
 * @returns Whether to send notification and its priority
 */
export async function analyzeDependencyNotification(
  task: Task,
  dependencyTasks: Task[],
  userId: string
): Promise<{ shouldNotify: boolean; priority: 'high' | 'medium' | 'low' }> {
  // TODO: Implement dependency notification logic based on:
  // - Task priority
  // - Chain completion status
  // - Time until due date
  // - User's current active hours
  return { shouldNotify: false, priority: 'low' };
}

/**
 * Analyze user's notification interaction patterns
 * @param userNotifications Previous notifications and their outcomes
 * @param userId The user's ID
 * @returns Analysis of effective notification patterns
 */
export async function analyzeNotificationPatterns(
  userNotifications: Notification[],
  userId: string
): Promise<{
  optimalTimes: { hour: number; effectiveness: number }[];
  channelEffectiveness: { email: number; push: number };
  responseRates: { [priority: string]: number };
}> {
  // TODO: Implement notification pattern analysis based on:
  // - Time-based response rates
  // - Channel effectiveness
  // - Priority-based engagement
  // - Action completion correlation
  return {
    optimalTimes: [],
    channelEffectiveness: { email: 0, push: 0 },
    responseRates: {}
  };
}

/**
 * Calculate optimal notification time based on user patterns
 * @param task Task to notify about
 * @param userPatterns User activity patterns
 * @param preferences User notification preferences
 * @returns Optimal timestamp for notification delivery
 */
async function calculateOptimalNotificationTime(
  task: Task,
  userPatterns: UserActivityPattern,
  preferences: UserNotificationPreferences
): Promise<Date> {
  const now = new Date();
  const userTz = preferences.timezone;
  const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTz }));
  const currentHour = userTime.getHours();

  // Check if we're in quiet hours
  const isQuietHours = preferences.quietHours && 
    currentHour >= preferences.quietHours.start && 
    currentHour < preferences.quietHours.end;

  // Find next active hour outside quiet hours
  let optimalHour = currentHour;
  if (isQuietHours || !userPatterns.activeHours.includes(currentHour)) {
    const futureHours = userPatterns.activeHours.filter(h => 
      h > currentHour && (!preferences.quietHours || 
        (h < preferences.quietHours.start || h >= preferences.quietHours.end))
    );
    optimalHour = futureHours[0] || userPatterns.activeHours[0];
  }

  // Calculate optimal date
  const optimalDate = new Date(userTime);
  if (optimalHour < currentHour) {
    optimalDate.setDate(optimalDate.getDate() + 1);
  }
  optimalDate.setHours(optimalHour, 0, 0, 0);

  return optimalDate;
}

/**
 * Bundle related notifications together
 * @param notifications Array of pending notifications
 * @returns Grouped notifications with shared context
 */
async function bundleRelatedNotifications(
  notifications: PendingNotification[]
): Promise<Array<{
  notifications: PendingNotification[];
  context: string;
  priority: NotificationPriority;
}>> {
  // Group notifications by context using semantic similarity
  const groups: Map<string, PendingNotification[]> = new Map();

  for (const notification of notifications) {
    let foundGroup = false;
    
    // Get embedding for current notification
    const response = await cohere.embed({
      texts: [notification.content],
      model: 'embed-english-v3.0'
    });

    const embeddings = response.embeddings;
    if (!Array.isArray(embeddings) || embeddings.length === 0) continue;

    const currentEmbedding = embeddings[0];
    if (!Array.isArray(currentEmbedding)) continue;

    // Compare with existing groups
    for (const [context, group] of groups.entries()) {
      const groupResponse = await cohere.embed({
        texts: [group[0].content],
        model: 'embed-english-v3.0'
      });

      const groupEmbeddings = groupResponse.embeddings;
      if (!Array.isArray(groupEmbeddings) || groupEmbeddings.length === 0) continue;

      const groupEmbedding = groupEmbeddings[0];
      if (!Array.isArray(groupEmbedding)) continue;

      // Calculate similarity
      const similarity = calculateCosineSimilarity(currentEmbedding, groupEmbedding);
      if (similarity > 0.7) {  // High similarity threshold
        group.push(notification);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      groups.set(notification.content, [notification]);
    }
  }

  // Convert groups to array format
  return Array.from(groups.entries()).map(([context, notifications]) => ({
    notifications,
    context,
    priority: calculateGroupPriority(notifications)
  }));
}

/**
 * Calculate cosine similarity between two embeddings
 */
function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
  const norm1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
  const norm2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (norm1 * norm2);
}

/**
 * Calculate priority for a group of notifications
 */
function calculateGroupPriority(notifications: PendingNotification[]): NotificationPriority {
  const priorities = notifications.map(n => n.priority);
  if (priorities.includes('Urgent')) return 'Urgent';
  if (priorities.includes('High')) return 'High';
  if (priorities.includes('Medium')) return 'Medium';
  return 'Low';
}

/**
 * Select optimal delivery channel based on user patterns and preferences
 * @param userPatterns User activity patterns
 * @param preferences User notification preferences
 * @param deliveryStats Previous delivery statistics
 * @returns Best channel for notification delivery
 */
function selectOptimalChannel(
  userPatterns: UserActivityPattern,
  preferences: UserNotificationPreferences,
  deliveryStats: NotificationDeliveryStats[]
): NotificationChannel['type'] {
  // Get enabled channels
  const enabledChannels = preferences.channels.filter(c => c.enabled);
  if (enabledChannels.length === 0) return 'in-app';  // Fallback to in-app

  // Calculate channel scores
  const channelScores = enabledChannels.map(channel => {
    const stats = deliveryStats.find(s => s.channel === channel.type);
    if (!stats) return { channel: channel.type, score: 0 };

    // Combine multiple factors for scoring
    const deliveryScore = stats.deliveryRate * 0.3;
    const responseScore = stats.responseRate * 0.3;
    const engagementScore = stats.engagementScore * 0.2;
    const reliabilityScore = (1 - stats.failureCount / 100) * 0.2;

    // Adjust based on current device usage
    let deviceBonus = 0;
    if (channel.type === 'push') {
      deviceBonus = userPatterns.deviceUsage.mobile * 0.2;
    } else if (channel.type === 'in-app') {
      deviceBonus = userPatterns.deviceUsage.desktop * 0.2;
    }

    return {
      channel: channel.type,
      score: deliveryScore + responseScore + engagementScore + reliabilityScore + deviceBonus
    };
  });

  // Return channel with highest score
  const bestChannel = channelScores.reduce((best, current) => 
    current.score > best.score ? current : best,
    { channel: 'in-app' as const, score: 0 }
  );

  return bestChannel.channel;
}

/**
 * Determine the type of notification needed for a task
 */
function determineNotificationType(task: Task): NotificationType {
  const now = new Date();
  const dueDate = task.settings?.dueDate;

  if (task.completed) {
    return 'task_completed';
  }
  
  if (dueDate && new Date(dueDate).getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
    return 'due_soon';
  }

  return 'reminder';
}

/**
 * Update notification delivery statistics
 * @param deliveryResult Result of notification delivery attempt
 * @param userResponse User's interaction with the notification
 * @returns Updated delivery statistics
 */
export function updateDeliveryStats(
  deliveryResult: {
    channel: string;
    success: boolean;
    engagementType?: 'viewed' | 'clicked' | 'responded';
    responseTime?: number;
  },
  currentStats: NotificationDeliveryStats
): NotificationDeliveryStats {
  const stats = { ...currentStats };

  // Update delivery rate
  stats.deliveryRate = calculateNewRate(
    stats.deliveryRate,
    deliveryResult.success ? 1 : 0,
    100
  );

  // Update failure count
  if (!deliveryResult.success) {
    stats.failureCount++;
  }

  // Update engagement metrics if user responded
  if (deliveryResult.engagementType) {
    stats.responseRate = calculateNewRate(
      stats.responseRate,
      1,
      100
    );

    // Calculate engagement score based on type of interaction
    const engagementValue = 
      deliveryResult.engagementType === 'responded' ? 1 :
      deliveryResult.engagementType === 'clicked' ? 0.7 :
      0.3;

    stats.engagementScore = calculateNewRate(
      stats.engagementScore,
      engagementValue,
      100
    );
  }

  return stats;
}

/**
 * Calculate new rate for moving averages
 */
function calculateNewRate(currentRate: number, newValue: number, windowSize: number): number {
  return (currentRate * (windowSize - 1) + newValue) / windowSize;
} 