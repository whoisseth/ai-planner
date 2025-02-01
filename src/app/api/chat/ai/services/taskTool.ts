import { z } from "zod";
import { createTask } from "@/app/actions/tasks";
import { getCurrentUser } from "@/lib/session";

// Define the task creation tool
export const createTaskTool = {
  description: "Create a new task with the specified details",
  parameters: z.object({
    title: z.string().describe("The title of the task"),
    priority: z
      .enum(["Low", "Medium", "High", "Urgent"])
      .optional()
      .describe("Priority level of the task"),
    dueDate: z
      .string()
      .optional()
      .describe("Due date for the task in YYYY-MM-DD format"),
    dueTime: z
      .string()
      .optional()
      .describe("Due time for the task in HH:mm format"),
  }),
  execute: async ({
    title,
    priority = "Medium",
    dueDate,
    dueTime,
  }: {
    title: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
    dueDate?: string;
    dueTime?: string;
  }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const taskData = {
      title,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      dueTime: dueTime || null,
      completed: false,
    };

    const task = await createTask(taskData);
    return {
      success: true,
      message: `Task "${title}" created successfully`,
      task,
    };
  },
}; 