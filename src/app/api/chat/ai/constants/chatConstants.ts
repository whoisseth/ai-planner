/**
 * Constants for task management and AI configuration
 */

// src/api/chat/ai/constants/chatConstants.ts
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
    "view my tasks",
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
    "display tasks",
  ],
  deletion: ["delete task", "remove task", "clear task"],
  update: [
    "update task",
    "modify task",
    "change task",
    "edit task",
    "mark task",
  ],
  search: ["search task", "find task", "look for task"],
};

export const AI_CONFIG = {
  // model: "llama-3.3-70b-versatile",
  model: "gemma2-9b-it",
  maxSteps: 8,
  // temperature: 0.6,
};

export const SYSTEM_PROMPTS = {
  base: `You are an AI assistant focused on task management and productivity. Your role is to help users manage their daily tasks and improve their productivity.`,
  responseStyle: `Always keep responses: 
    - Concise and to the point
    - Practical and actionable
    `,
};

// - Relevant to task management and productivity
