import { z } from "zod";
import { createTask, getTasks, deleteTask, searchTaskByTitle, updateTask } from "@/app/actions/tasks";
import { getCurrentUser } from "@/lib/session";
import { tool } from "ai";
import { Task } from "@/components/TaskItem";
import { revalidatePath } from "next/cache";

// Helper functions for date and time formatting
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Define the task creation tool
export const createTaskTool = tool({
  type: "function",
  description: "Creates and schedules new tasks with customizable title, priority, due date, and time while supporting reminders and task organization.",
  parameters: z.object({
    title: z.string().describe("The title of the task"),
    priority: z
      .enum(["Low", "Medium", "High", "Urgent"])
      .optional()
      .describe("Priority level of the task"),
    dueDate: z
      .string()
      .optional()
      .describe("Due date for the task (e.g., '5 Feb 2025')"),
    dueTime: z
      .string()
      .optional()
      .describe("Due time for the task (e.g., '11:30 AM')"),
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

      // Get current date
      const now = new Date();

      // Format current date and time as defaults
      const currentFormattedDate = formatDate(now);
      const currentFormattedTime = formatTime(now);

      // Use provided values or defaults
      const taskDate = dueDate || currentFormattedDate;
      const taskTime = dueTime || currentFormattedTime;

      // Parse and validate the date
      let parsedDate: Date;
      try {
        parsedDate = dueDate ? new Date(dueDate) : now;
        if (isNaN(parsedDate.getTime())) {
          console.error("Invalid date provided, using current date");
          parsedDate = now;
        }
      } catch (error: any) {
        console.error("Error parsing date:", error);
        parsedDate = now;
      }

      const taskData = {
        title,
        priority,
        dueDate: parsedDate,
        dueTime: taskTime,
        completed: false,
        userId: user.id,
      };

      console.log("Processed task data:", taskData);

      const task = await createTask(taskData);
      revalidatePath("/");

      // Format the response with properly formatted date and time
      const formattedResponse = {
        success: true,
        task: {
          id: task.id,
          title: task.title,
          priority: task.priority,
          dueDate: formatDate(parsedDate),
          dueTime: task.dueTime,
          completed: task.completed
        }
      };

      return formattedResponse;
    } catch (error: any) {
      console.error("Error in createTaskTool:", error);
      return {
        success: false,
        error: `Failed to create task: ${error.message}`
      };
    }
  },
});

//  Define the to Get the task  tool
export const getTasksTool = tool({
  type: "function",
  description: "Retrieves and filters tasks based on completion status and date filters, supporting various timeframes like today, tomorrow, or specific dates.",
  parameters: z.object({
    includeCompleted: z
      .boolean()
      .optional()
      .describe("Whether to include completed tasks in the results"),
    dateFilter: z
      .string()
      .optional()
      .describe(
        "Filter tasks by date (e.g., 'today', 'tomorrow', or specific date like '5 Feb 2025')",
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

      // Format tasks for response using the helper functions
      const formattedTasks = filteredTasks.map((task: Task) => ({
        id: task.id,
        title: task.title,
        status: task.completed ? "completed" : "active",
        priority: task.priority,
        dueDate: task.dueDate ? formatDate(new Date(task.dueDate)) : null,
        dueTime: task.dueTime || null,
      }));

      return {
        success: true,
        message: `Retrieved ${formattedTasks.length} tasks`,
        tasks: formattedTasks,
      };
    } catch (error: any) {
      console.error("Error in getTasksTool:", error);
      return {
        success: false,
        error: `Failed to get tasks: ${error.message}`
      };
    }
  },
});

// Add this new tool after the existing tools
export const deleteTaskTool = tool({
  type: "function",
  description: "Removes tasks from the task list using intelligent title-based search to find and delete the most relevant matching task.",
  parameters: z.object({
    title: z.string().describe("The title of the task to delete"),
  }),
  execute: async ({ title }: { title: string }) => {
    try {
      // First search for the task by title
      const searchResult = await searchTaskByTitle(title);

      if (!searchResult || searchResult.length === 0) {
        throw new Error(`No task found with title similar to "${title}"`);
      }

      // Use the first matching task's ID
      const taskToDelete = searchResult[0];
      const result = await deleteTask(taskToDelete.id);

      return {
        success: true,
        message: `Successfully deleted task: ${taskToDelete.title}`
      };
    } catch (error: any) {
      console.error("Error in deleteTaskTool:", error);
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  },
});

// search task by title
export const searchTaskByTitleTool = tool({
  type: "function",
  description: "Searches for tasks using fuzzy matching on titles to find exact or similar matches within the user's task list.",
  parameters: z.object({
    title: z.string().describe("The title of the task to search for"),
  }),
  execute: async ({ title }: { title: string }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");
    const tasks = await searchTaskByTitle(title);
    return tasks;
  },
});

// Add this new tool before the final export
export const updateTaskTool = tool({
  type: "function",
  description: "Modifies existing tasks by updating any combination of title, priority, due date, time, or completion status while preserving unchanged fields.",
  parameters: z.object({
    taskId: z.string().describe("The ID of the task to update"),
    title: z.string().optional().describe("The new title of the task"),
    priority: z
      .enum(["Low", "Medium", "High", "Urgent"])
      .optional()
      .describe("New priority level of the task"),
    dueDate: z
      .string()
      .optional()
      .describe("New due date for the task in YYYY-MM-DD format"),
    dueTime: z
      .string()
      .optional()
      .describe("New due time for the task in HH:mm format"),
    completed: z
      .boolean()
      .optional()
      .describe("New completion status of the task"),
  }),
  execute: async ({
    taskId,
    title,
    priority,
    dueDate,
    dueTime,
    completed,
  }: {
    taskId: string;
    title?: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
    dueDate?: string;
    dueTime?: string;
    completed?: boolean;
  }) => {
    try {
      console.log("Updating task with parameters:", {
        taskId,
        title,
        priority,
        dueDate,
        dueTime,
        completed,
      });

      const user = await getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      // Parse the date if provided
      let parsedDate: Date | undefined;
      if (dueDate) {
        try {
          parsedDate = new Date(dueDate);
          if (isNaN(parsedDate.getTime())) {
            throw new Error("Invalid date format");
          }
        } catch (error) {
          throw new Error("Invalid date format");
        }
      }

      const updateData = {
        id: taskId,
        title,
        priority,
        dueDate: parsedDate,
        dueTime,
        completed,
        userId: user.id,
      };

      // Remove undefined values
      (Object.keys(updateData) as Array<keyof typeof updateData>).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      const updatedTask = await updateTask(taskId, updateData);
      revalidatePath("/");

      return {
        success: true,
        message: `Task updated successfully`,
        task: updatedTask,
      };
    } catch (error: any) {
      console.error("Error in updateTaskTool:", error);
      throw new Error(`Failed to update task: ${error.message}`);
    }
  },
});


