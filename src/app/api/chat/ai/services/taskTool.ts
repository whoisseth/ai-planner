import { z } from "zod";
import { createTask, getTasks } from "@/app/actions/tasks";
import { getCurrentUser } from "@/lib/session";
import { tool } from "ai";
import { Task } from "@/components/TaskItem";
import { revalidatePath } from "next/cache";

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
      revalidatePath("/");
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

//  Define the to Get the task  tool
export const getTasksTool = tool({
  type: "function",
  description: "Get all tasks from the database with optional filtering",
  parameters: z.object({
    includeCompleted: z
      .boolean()
      .optional()
      .describe("Whether to include completed tasks in the results"),
    dateFilter: z
      .string()
      .optional()
      .describe(
        "Filter tasks by date (e.g., 'today', 'tomorrow', or 'YYYY-MM-DD')",
      ),
  }),
  execute: async ({
    includeCompleted = true,
    dateFilter,
  }: {
    includeCompleted?: boolean;
    dateFilter?: string;
  }) => {
    try {
      console.log("Getting tasks with parameters:", {
        includeCompleted,
        dateFilter,
      });

      const user = await getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      const tasks = await getTasks();

      // Filter tasks based on completion status if specified
      let filteredTasks = tasks;
      if (!includeCompleted) {
        filteredTasks = tasks.filter((task: Task) => !task.completed);
      }

      // Filter by date if specified
      if (dateFilter) {
        const targetDate = (() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          switch (dateFilter.toLowerCase()) {
            case "today":
              return today;
            case "tomorrow":
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              return tomorrow;
            default:
              try {
                const date = new Date(dateFilter);
                if (!isNaN(date.getTime())) return date;
              } catch (e) {
                console.error("Invalid date filter:", dateFilter);
              }
              return null;
          }
        })();

        if (targetDate) {
          filteredTasks = filteredTasks.filter((task: Task) => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === targetDate.toDateString();
          });
        }
      }

      // Format tasks for response
      const formattedTasks = filteredTasks.map((task: Task) => ({
        id: task.id,
        title: task.title,
        status: task.completed ? "completed" : "active",
        priority: task.priority,
        dueDate: task.dueDate
          ? new Date(task.dueDate).toLocaleDateString()
          : null,
        dueTime: task.dueTime || null,
        subtasks: task.subtasks || [],
      }));

      return {
        success: true,
        message: `Retrieved ${formattedTasks.length} tasks`,
        tasks: formattedTasks,
      };
    } catch (error: any) {
      console.error("Error in getTasksTool:", error);
      throw new Error(`Failed to get tasks: ${error.message}`);
    }
  },
});
