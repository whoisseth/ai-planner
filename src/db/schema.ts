import { sql } from "drizzle-orm";
import { 
  integer, 
  text, 
  sqliteTableCreator,
  primaryKey,
  foreignKey,
  type SQLiteTableWithColumns,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

const sqliteTable = sqliteTableCreator((name) => `${name}`);

// Helper for SQLite boolean fields
const sqliteBoolean = (name: string) => integer(name, { mode: "boolean" });

// Auth and User Management
export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const profiles = sqliteTable("profile", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  displayName: text("display_name").notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIndex: index("profile_user_id_idx").on(table.userId),
}));

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  providerType: text("provider_type", { enum: ["oauth", "email", "credentials"] }).notNull(),
  provider: text("provider", { enum: ["google", "github", "email"] }).notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
  password: text("password"),
  salt: text("salt"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  providerAccountIdIndex: index("provider_account_id_idx").on(table.providerAccountId),
  userIdIndex: index("user_id_idx").on(table.userId),
}));

export const magicLinks = sqliteTable("magic_links", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull(),
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }).notNull(),
  used: sqliteBoolean("used").notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const verifyEmailTokens = sqliteTable("verify_email_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull(),
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

// Chat System
export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title"),
  context: text("context", { mode: "json" }), // Store any session context/metadata
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").references(() => chatSessions.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  metadata: text("metadata", { mode: "json" }), // Store any message-specific metadata
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

// Core Task Management
export const lists = sqliteTable("lists", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isDefault: sqliteBoolean("is_default").notNull().default(false),
  isStarred: sqliteBoolean("is_starred").notNull().default(false),
  isDone: sqliteBoolean("is_done").notNull().default(false),
  isEditable: sqliteBoolean("is_editable").notNull().default(true),
  isDeletable: sqliteBoolean("is_deletable").notNull().default(true),
  isDeleted: sqliteBoolean("is_deleted").notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

// Tasks table with self-reference
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  listId: text("list_id").references(() => lists.id, { onDelete: "cascade" }).notNull(),
  type: text("type", { enum: ["main", "sub"] }).notNull().default("main"),
  parentId: text("parent_id"),  // Self-reference for subtasks
  title: text("title").notNull(),
  description: text("description"),
  starred: sqliteBoolean("starred").notNull().default(false),
  completed: sqliteBoolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  priority: text("priority", { enum: ["Low", "Medium", "High", "Urgent"] }).notNull().default("Medium"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  dueTime: text("due_time"),
  reminder: text("reminder", { mode: "json" }), // JSON object for reminder configuration: {
                                               //   time: timestamp,
                                               //   type: "email" | "push" | "both",
                                               //   notifiedAt: timestamp | null,
                                               //   recurrence: {
                                               //     frequency: "none" | "daily" | "weekly" | "monthly" | "yearly",
                                               //     interval: number,
                                               //     daysOfWeek?: number[],
                                               //     endDate?: timestamp,
                                               //     count?: number
                                               //   }
                                               // }
  isDeleted: sqliteBoolean("is_deleted").notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  parentReference: foreignKey(() => ({
    columns: [table.parentId],
    foreignColumns: [table.id]
  })).onDelete("cascade"),
  userListIndex: index("tasks_user_list_idx").on(table.userId, table.listId),
  userCompletedIndex: index("tasks_user_completed_idx").on(table.userId, table.completed),
  typeIndex: index("tasks_type_idx").on(table.type),
  reminderIndex: index("tasks_reminder_idx").on(table.reminder),
  deletedAtIndex: index("tasks_deleted_at_idx").on(table.deletedAt),
  isDeletedIndex: index("tasks_is_deleted_idx").on(table.isDeleted),
  sortOrderIndex: index("tasks_sort_order_idx").on(table.sortOrder),
}));

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsed: integer("last_used", { mode: "timestamp" }),
  isDeleted: sqliteBoolean("is_deleted").notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userNameUnique: unique("tags_user_name_unique").on(table.userId, table.name),
  userUsageCountIndex: index("tags_user_usage_count_idx").on(table.userId, table.usageCount),
  isDeletedIndex: index("tags_is_deleted_idx").on(table.isDeleted),
  deletedAtIndex: index("tags_deleted_at_idx").on(table.deletedAt),
}));

export const taskTags = sqliteTable("task_tags", {
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  tagId: text("tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.taskId, table.tagId] }),
  taskTagUnique: unique("task_tags_unique").on(table.taskId, table.tagId),
}));

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  type: text("type", { 
    enum: ["reminder", "dependency_blocked", "dependency_unblocked", "task_completed", "task_assigned", "due_soon"] 
  }).notNull(),
  status: text("status", { enum: ["pending", "sent", "read", "failed"] }).notNull().default("pending"),
  channel: text("channel", { enum: ["email", "push", "both"] }).notNull(),
  scheduledFor: integer("scheduled_for", { mode: "timestamp" }).notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  readAt: integer("read_at", { mode: "timestamp" }),
  payload: text("payload", { mode: "json" }), // JSON object for notification details
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

// Type exports
export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type MagicLink = typeof magicLinks.$inferSelect;
export type VerifyEmailToken = typeof verifyEmailTokens.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type List = typeof lists.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type TaskTag = typeof taskTags.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
