/**
 * Constants for task management and AI configuration
 */

export const TASK_MANAGEMENT_KEYWORDS = {
  creation: [
    "create task",
    "add task",
    "new task",
    "make task",
    "schedule task",
    "remind me to",
    "set reminder",
    "add to my list",
    "add to todo",
  ],
  viewing: [
    "show tasks",
    "view tasks",
    "list tasks",
    "get tasks",
    "my tasks",
    "show my tasks",
    "what are my tasks",
    "pending tasks",
    "today's tasks",
    "tasks for today",
    "upcoming tasks",
    "completed tasks",
    "all tasks",
  ],
};

export const AI_CONFIG = {
  model: "llama-3.3-70b-versatile",
  maxSteps: 5,
  temperature: 0.7,
};

export const SYSTEM_PROMPTS = {
  base: `You are an AI assistant focused on task management and productivity. Your role is to help users manage their daily tasks and improve their productivity.`,
}; 