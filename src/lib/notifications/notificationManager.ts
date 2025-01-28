/**
 * @file notificationManager.ts
 * @description Manages the creation, scheduling, and delivery of notifications based on user preferences
 * and engagement patterns. Implements smart delivery algorithms to optimize notification timing and channels.
 */

import { db } from "@/db";
import { notifications, tasks, users } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { type Notification } from "@/db/schema";
import {
  findSimilarNotifications,
  getOptimalDeliveryTime,
  getBestDeliveryChannel,
  analyzeNotificationPriority,
  updateEngagementMetrics
} from '../ai/notificationAI';
import type { UserActivityPattern, NotificationMetrics } from '../ai/notificationAI';

/**
 * Helper function to convert Date to SQLite timestamp
 */
function toSQLiteTimestamp(date: Date) {
  return sql`strftime('%s', ${date.toISOString()})`;
}

/**
 * Helper function to get current SQLite timestamp
 */
function currentSQLiteTimestamp() {
  return sql`CURRENT_TIMESTAMP`;
}

/**
 * Helper function to convert SQLite timestamp to Date
 */
function fromSQLiteTimestamp(timestamp: string | null): Date | null {
  if (!timestamp) return null;
  return new Date(timestamp);
}

/**
 * Interface for notification payload
 */
interface NotificationPayload {
  priority?: 'high' | 'medium' | 'low';
  bundled?: boolean;
  bundledNotifications?: Array<{
    id: string;
    type: string;
    payload: Record<string, unknown>;
  }>;
  [key: string]: unknown;
}

/**
 * Represents the configuration for notification delivery
 */
interface DeliveryConfig {
  preferredChannel: "email" | "push" | "both";
  quietHours?: {
    start: number;  // Hour in 24-hour format
    end: number;    // Hour in 24-hour format
  };
  deviceAvailability?: {
    desktop: boolean;
    mobile: boolean;
  };
}

/**
 * Represents user engagement metrics for adaptive delivery
 */
interface EngagementMetrics {
  responseRate: number;
  channelEffectiveness: {
    email: number;
    push: number;
  };
  averageResponseTime: number;
}

/**
 * Creates a new notification
 */
export async function createNotification(
  userId: string,
  taskId: string,
  type: Notification["type"],
  scheduledFor: Date,
  channel: Notification["channel"] = "both"
): Promise<string> {
  const notificationId = crypto.randomUUID();
  
  const [notification] = await db
    .insert(notifications)
    .values({
      id: notificationId,
      userId,
      taskId,
      type,
      status: "pending",
      channel,
      scheduledFor: toSQLiteTimestamp(scheduledFor),
      payload: {},
      createdAt: currentSQLiteTimestamp(),
      updatedAt: currentSQLiteTimestamp(),
    })
    .returning();

  return notification.id;
}

/**
 * Processes notifications that are due for delivery with AI-powered optimizations
 */
export async function processNotifications(): Promise<void> {
  const now = new Date();
  const pendingNotifications = await db
    .select()
    .from(notifications)
    .where(and(
      eq(notifications.status, "pending"),
      lte(notifications.scheduledFor, toSQLiteTimestamp(now))
    ));

  // Group notifications by user for smart bundling
  const notificationsByUser = new Map<string, Notification[]>();
  pendingNotifications.forEach(notification => {
    const userNotifications = notificationsByUser.get(notification.userId) || [];
    userNotifications.push(notification);
    notificationsByUser.set(notification.userId, userNotifications);
  });

  for (const [userId, userNotifications] of notificationsByUser.entries()) {
    const deliveryConfig = await getDeliveryConfig(userId);
    const metrics = await getEngagementMetrics(userId);
    const activityPattern = await getUserActivityPattern(userId);

    // Process each notification with AI optimizations
    for (const notification of userNotifications) {
      // Find similar notifications for bundling
      const similarNotifications = await findSimilarNotifications(notification, userId);
      
      if (similarNotifications.length > 0) {
        // Bundle similar notifications
        await bundleNotifications(notification, similarNotifications);
        continue;
      }

      // Determine optimal delivery time
      const optimalTime = await getOptimalDeliveryTime(userId, notification, activityPattern);
      
      // If optimal time is in the future, reschedule
      if (optimalTime > now) {
        await rescheduleNotification(notification, optimalTime);
        continue;
      }

      // Analyze priority
      const priority = await analyzeNotificationPriority(notification);
      
      // Get best delivery channel based on metrics
      const bestChannel = getBestDeliveryChannel(metrics);
      
      // Update notification with optimized settings
      await db
        .update(notifications)
        .set({
          channel: bestChannel,
          payload: {
            ...(notification.payload as NotificationPayload),
            priority,
            bundled: false
          } as NotificationPayload
        })
        .where(eq(notifications.id, notification.id));

      if (shouldDeliver(notification, deliveryConfig, metrics)) {
        await deliverNotification(notification, deliveryConfig);
        
        // Update engagement metrics after delivery
        const updatedMetrics = await updateEngagementMetrics(notification, metrics);
        await updateUserMetrics(userId, updatedMetrics);
      }
    }
  }
}

/**
 * Bundles similar notifications together
 */
async function bundleNotifications(
  mainNotification: Notification,
  similarNotifications: Notification[]
): Promise<void> {
  // Create a bundled notification
  const bundledPayload: NotificationPayload = {
    ...(mainNotification.payload as NotificationPayload),
    bundled: true,
    bundledNotifications: similarNotifications.map(n => ({
      id: n.id,
      type: n.type,
      payload: n.payload as Record<string, unknown>
    }))
  };

  // Update main notification with bundled content
  await db
    .update(notifications)
    .set({
      payload: bundledPayload,
      updatedAt: currentSQLiteTimestamp()
    })
    .where(eq(notifications.id, mainNotification.id));

  // Mark bundled notifications as processed
  for (const notification of similarNotifications) {
    await db
      .update(notifications)
      .set({
        status: "sent", // Changed from "processed" to match the schema
        updatedAt: currentSQLiteTimestamp()
      })
      .where(eq(notifications.id, notification.id));
  }
}

/**
 * Gets user activity pattern for optimal delivery timing
 */
async function getUserActivityPattern(userId: string): Promise<UserActivityPattern> {
  // TODO: Implement user activity pattern retrieval from database
  return {
    activeHours: [9, 10, 11, 12, 13, 14, 15, 16, 17],
    preferredDevices: ['desktop', 'mobile'],
    timeZone: 'UTC',
    quietHours: {
      start: 22,
      end: 8
    }
  };
}

/**
 * Updates user metrics in the database
 */
async function updateUserMetrics(userId: string, metrics: NotificationMetrics): Promise<void> {
  // TODO: Implement user metrics update in database
  console.log('Updating metrics for user:', userId, metrics);
}

/**
 * Gets the delivery configuration for a user
 */
async function getDeliveryConfig(userId: string): Promise<DeliveryConfig> {
  // TODO: Implement user preferences retrieval
  return {
    preferredChannel: "both",
    quietHours: {
      start: 22,  // 10 PM
      end: 8,     // 8 AM
    },
    deviceAvailability: {
      desktop: true,
      mobile: true,
    },
  };
}

/**
 * Gets engagement metrics for a user
 */
async function getEngagementMetrics(userId: string): Promise<NotificationMetrics> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentNotifications = await db
    .select()
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      gte(notifications.createdAt, toSQLiteTimestamp(thirtyDaysAgo))
    ));

  const totalNotifications = recentNotifications.length;
  if (totalNotifications === 0) {
    return {
      readRate: 1,
      responseTime: 0,
      channelEffectiveness: { 
        email: 1, 
        push: 1 
      }
    };
  }

  const readNotifications = recentNotifications.filter(n => n.status === "read");
  const emailNotifications = recentNotifications.filter(n => 
    n.channel === "email" || n.channel === "both"
  );
  const pushNotifications = recentNotifications.filter(n => 
    n.channel === "push" || n.channel === "both"
  );

  const responseTimes = readNotifications
    .filter(n => n.readAt && n.sentAt)
    .map(n => {
      const readTime = fromSQLiteTimestamp(String(n.readAt));
      const sentTime = fromSQLiteTimestamp(String(n.sentAt));
      if (!readTime || !sentTime) return 0;
      return readTime.getTime() - sentTime.getTime();
    })
    .filter(time => time > 0);

  return {
    readRate: readNotifications.length / totalNotifications,
    responseTime: responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0,
    channelEffectiveness: {
      email: emailNotifications.filter(n => n.status === "read").length / 
        (emailNotifications.length || 1),
      push: pushNotifications.filter(n => n.status === "read").length / 
        (pushNotifications.length || 1)
    }
  };
}

/**
 * Determines if a notification should be delivered based on user preferences and engagement metrics
 */
function shouldDeliver(
  notification: Notification,
  config: DeliveryConfig,
  metrics: NotificationMetrics
): boolean {
  const hour = new Date().getHours();
  
  // Don't deliver during quiet hours
  if (config.quietHours) {
    const { start, end } = config.quietHours;
    if (hour >= start || hour < end) {
      return false;
    }
  }

  // Check device availability
  if (config.deviceAvailability) {
    if (!config.deviceAvailability.desktop && !config.deviceAvailability.mobile) {
      return false;
    }
  }

  // Use engagement metrics to determine optimal delivery
  const threshold = 0.2; // Minimum engagement threshold
  if (metrics.readRate < threshold) {
    // If read rate is low, only send high-priority notifications
    return notification.type === "reminder" || 
           notification.type === "dependency_blocked" ||
           notification.type === "due_soon";
  }

  return true;
}

/**
 * Delivers a notification through the specified channel(s)
 */
async function deliverNotification(
  notification: Notification,
  config: DeliveryConfig
): Promise<void> {
  const channels = getDeliveryChannels(notification.channel, config);
  
  for (const channel of channels) {
    try {
      if (channel === "email") {
        // TODO: Implement email delivery
      } else if (channel === "push") {
        // TODO: Implement push notification delivery
      }
    } catch (error) {
      console.error(`Failed to deliver notification ${notification.id} via ${channel}:`, error);
      continue;
    }
  }

  await db
    .update(notifications)
    .set({
      status: "sent",
      sentAt: currentSQLiteTimestamp(),
      updatedAt: currentSQLiteTimestamp(),
    })
    .where(eq(notifications.id, notification.id));
}

/**
 * Determines which channels to use for delivery based on notification and user preferences
 */
function getDeliveryChannels(
  notificationChannel: Notification["channel"],
  config: DeliveryConfig
): Array<"email" | "push"> {
  if (notificationChannel === "both") {
    return config.preferredChannel === "both" 
      ? ["email", "push"]
      : [config.preferredChannel];
  }
  return [notificationChannel];
}

/**
 * Reschedules a notification that couldn't be delivered
 */
async function rescheduleNotification(notification: Notification, scheduledFor: Date): Promise<void> {
  await db
    .update(notifications)
    .set({
      scheduledFor: toSQLiteTimestamp(scheduledFor),
      updatedAt: currentSQLiteTimestamp(),
    })
    .where(eq(notifications.id, notification.id));
}

/**
 * Marks a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await db
    .update(notifications)
    .set({
      status: "read",
      readAt: currentSQLiteTimestamp(),
      updatedAt: currentSQLiteTimestamp(),
    })
    .where(eq(notifications.id, notificationId));
}

/**
 * Creates a reminder notification for a task
 */
export async function createTaskReminder(
  userId: string,
  taskId: string,
  scheduledFor: Date
): Promise<string> {
  return createNotification(userId, taskId, "reminder", scheduledFor);
}

/**
 * Creates a dependency blocked notification
 */
export async function createDependencyBlockedNotification(
  userId: string,
  taskId: string
): Promise<string> {
  return createNotification(userId, taskId, "dependency_blocked", new Date());
}

/**
 * Creates a due soon notification
 */
export async function createDueSoonNotification(
  userId: string,
  taskId: string,
  dueDate: Date
): Promise<string> {
  // Schedule notification 24 hours before due date
  const scheduledFor = new Date(dueDate);
  scheduledFor.setHours(scheduledFor.getHours() - 24);
  return createNotification(userId, taskId, "due_soon", scheduledFor);
} 