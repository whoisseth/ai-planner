import { z } from "zod";
import { createTask } from "@/app/actions/tasks";
import { getCurrentUser } from "@/lib/session";
import { tool } from "ai";

// Define the task creation tool
export const createTaskTool = tool({
  type: "function",
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
    try {
      console.log("Creating task with parameters:", {
        title,
        priority,
        dueDate,
        dueTime,
      });

      const user = await getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      // Get current date and time
      const today = new Date();
      const defaultDate = today.toISOString().split("T")[0];
      const defaultTime = today.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      // Validate and parse the date
      let parsedDate: Date;
      try {
        parsedDate = dueDate ? new Date(dueDate) : new Date(defaultDate);
        if (isNaN(parsedDate.getTime())) {
          console.error("Invalid date provided, using default date");
          parsedDate = new Date(defaultDate);
        }
      } catch (error: any) {
        console.error("Error parsing date:", error);
        parsedDate = new Date(defaultDate);
      }

      const taskData = {
        title,
        priority,
        dueDate: parsedDate,
        dueTime: dueTime || defaultTime,
        completed: false,
        userId: user.id,
      };

      console.log("Processed task data:", taskData);

      const task = await createTask(taskData);
      console.log("Task created successfully:", task);

      return {
        success: true,
        message: `Task "${title}" created successfully`,
        task,
      };
    } catch (error: any) {
      console.error("Error in createTaskTool:", error);
      throw new Error(`Failed to create task: ${error.message}`);
    }
  },
});
