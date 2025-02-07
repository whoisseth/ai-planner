import { z } from "zod";
import {
  createTask,
  getTasks,
  deleteTask,
  searchTaskByTitle,
  updateTask,
} from "@/app/actions/tasks";
import { getCurrentUser } from "@/lib/session";
import { tool } from "ai";
import { Task } from "@/components/TaskItem";
import { revalidatePath } from "next/cache";
import { getCurrentDateTime, determineTargetTimezone } from "./dateTimeTool";

// Helper functions for date and time formatting
const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Add new helper function to validate date is not in the past
const validateDate = (date: Date, timeZone?: string): Date => {
  // Get current date/time in the specified timezone using the existing tool
  const currentDateTime = getCurrentDateTime(timeZone);
  const now = new Date(currentDateTime.timestamp);

  // Reset time part for date comparison
  const dateToCheck = new Date(date);
  dateToCheck.setHours(0, 0, 0, 0);
  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);

  // If date is in the past, return today's date
  if (dateToCheck < todayDate) {
    console.warn("Past date detected, using current date instead");
    return todayDate;
  }
  return date;
};

// Helper function to convert 12-hour time to 24-hour format
const convertTo24HourFormat = (time: string): string => {
  // Handle empty or invalid input
  if (!time) return "";

  try {
    // Check if the time is already in 24-hour format (HH:mm)
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      // Already in correct format, just ensure it's padded correctly
      const [hours, minutes] = time.split(":").map((num) => parseInt(num));
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }

    // Handle 12-hour format (e.g., "1:30 PM")
    const [timePart, meridiem] = time.toUpperCase().split(" ");
    if (!meridiem || !["AM", "PM"].includes(meridiem)) {
      return "";
    }

    let [hours, minutes] = timePart.split(":").map((num) => parseInt(num));
    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      hours < 1 ||
      hours > 12 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return "";
    }

    // Convert to 24-hour format
    if (meridiem === "PM" && hours !== 12) {
      hours += 12;
    } else if (meridiem === "AM" && hours === 12) {
      hours = 0;
    }

    // Format as HH:mm
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  } catch (error) {
    console.error("Error converting time format:", error);
    return "";
  }
};

// Helper function to parse relative time
const parseRelativeTime = (
  timeExpression: string,
  timeZone?: string,
): Date | null => {
  const currentDateTime = getCurrentDateTime(timeZone);
  const now = new Date(currentDateTime.timestamp);

  // Match patterns like "5 minutes later", "2 hours later", etc.
  const match = timeExpression.match(
    /(\d+)\s*(minute|hour|day|week)s?\s*later/i,
  );
  if (!match) return null;

  const [_, amount, unit] = match;
  const value = parseInt(amount);

  switch (unit.toLowerCase()) {
    case "minute":
      now.setMinutes(now.getMinutes() + value);
      break;
    case "hour":
      now.setHours(now.getHours() + value);
      break;
    case "day":
      now.setDate(now.getDate() + value);
      break;
    case "week":
      now.setDate(now.getDate() + value * 7);
      break;
  }

  return now;
};

// Define the task creation tool
export const createTaskTool = tool({
  type: "function",
  description:
    "Creates and schedules new tasks with customizable title, priority, due date, and time while supporting reminders and task organization. And if the task due date and time is not provided then automatically analyse what should be the best time for and due date for that task",
  parameters: z.object({
    title: z.string().describe("The title of the task"),
    priority: z
      .enum(["Low", "Medium", "High", "Urgent"])
      .default("Medium")
      .describe("Priority level of the task"),
    dueDate: z
      .string()
      .optional()
      .describe("Due date for the task in YYYY-MM-DD format"),
    dueTime: z
      .string()
      .optional()
      .describe("Due time for the task in HH:mm 24-hour format"),
    timeZone: z.string().describe("The timezone to use for the task"),
  }),
  execute: async ({
    title,
    priority = "Medium",
    dueDate,
    dueTime,
    timeZone,
  }: {
    title: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
    dueDate?: string;
    dueTime?: string;
    timeZone: string;
  }) => {
    try {
      console.log("Creating task with parameters:", {
        title,
        priority,
        dueDate,
        dueTime,
        timeZone,
      });

      const user = await getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      // Get current date/time in the specified timezone
      const currentDateTime = getCurrentDateTime(timeZone);
      const now = new Date(currentDateTime.timestamp);

      // Set default date to today
      let targetDate = now;

      // Parse and validate date if provided
      if (dueDate) {
        try {
          const parsedDate = new Date(dueDate);
          if (!isNaN(parsedDate.getTime())) {
            targetDate = validateDate(parsedDate, timeZone);
          } else {
            console.warn("Invalid date format provided, using current date");
          }
        } catch (error) {
          console.warn("Error parsing date:", error);
        }
      }

      // Set default time to end of day
      let formattedTime = "23:59";

      // Parse and validate time if provided
      if (dueTime) {
        const convertedTime = convertTo24HourFormat(dueTime);
        if (convertedTime) {
          formattedTime = convertedTime;
        } else {
          console.warn(
            "Invalid time format provided, using default time 23:59",
          );
        }
      }

      const taskData = {
        title,
        priority,
        dueDate: targetDate,
        dueTime: formattedTime,
        completed: false,
        userId: user.id,
      };

      console.log("Processed task data:", taskData);

      const task = await createTask(taskData);
      revalidatePath("/dashboard");

      return {
        success: true,
        message: `Task "${title}" has been created successfully for ${formatDate(targetDate)} at ${formattedTime}`,
        task: {
          id: task.id,
          title: task.title,
          priority: task.priority,
          dueDate: formatDate(targetDate),
          dueTime: formattedTime,
          completed: task.completed,
        },
      };
    } catch (error: any) {
      console.error("Error in createTaskTool:", error);
      return {
        success: false,
        error: `Failed to create task: ${error.message}`,
      };
    }
  },
});

//  Define the to Get the task  tool
export const getTasksTool = tool({
  type: "function",
  description:
    "Returns tasks based on user's request - can show all tasks or filter by specific conditions like showing only today's tasks, tomorrow's tasks, high priority task, medium priority task, low priority task,Search by title, or tasks for a specific date. Also supports filtering by completion status, .",
  parameters: z.object({
    includeCompleted: z
      .boolean()
      .optional()
      .describe("Whether to include completed tasks in the results"),
    dateFilter: z
      .string()
      .optional()
      .describe(
        "Filter tasks by date - use 'all' to show all tasks, 'today' for today's tasks, 'tomorrow' for tomorrow's tasks, or specify a date like '5 Feb 2025' to see tasks for that date",
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
      console.log("Running getTask tool with parameters:", {
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
          const currentDateTime = getCurrentDateTime();
          const today = new Date(currentDateTime.timestamp);
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
        error: `Failed to get tasks: ${error.message}`,
      };
    }
  },
});

// Add this new tool after the existing tools
export const deleteTaskTool = tool({
  type: "function",
  description: "Delete the task with the given title",
  parameters: z.object({
    title: z.string().describe("The title of the task to delete"),
  }),
  execute: async ({ title }: { title: string }) => {
    try {
      // First search for the task by title\
      console.log("Deleting task with title:", title);
      const searchResult = await searchTaskByTitle(title);

      if (!searchResult || searchResult.length === 0) {
        throw new Error(`No task found with title similar to "${title}"`);
      }

      // Use the first matching task's ID
      const taskToDelete = searchResult[0];
      const result = await deleteTask(taskToDelete.id);
      revalidatePath("/");
      return {
        success: true,
        message: `Successfully deleted task: ${taskToDelete.title}`,
      };
    } catch (error: any) {
      console.error("Error in deleteTaskTool:", error);
      return {
        success: false,
        error: `Failed to delete task: ${error.message}`,
      };
    }
  },
});

// search task by title
export const searchTaskByTitleTool = tool({
  type: "function",
  description:
    "Searches for tasks using fuzzy matching on titles to find exact or similar matches within the user's task list.",
  parameters: z.object({
    title: z.string().describe("The title of the task to search for"),
  }),
  execute: async ({ title }: { title: string }) => {
    console.log("Searching for task with title:", title);
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");
    const tasks = await searchTaskByTitle(title);
    return tasks;
  },
});

// Add this new tool before the final export
export const updateTaskTool = tool({
  type: "function",
  description:
    "Modifies existing tasks by updating any combination of title, priority, due date, time, or completion status while preserving unchanged fields.",
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
      .describe(
        "New due date for the task (e.g., '5 Feb 2025' or 'in 5 minutes')",
      ),
    dueTime: z
      .string()
      .optional()
      .describe(
        "New due time for the task (e.g., '11:30 AM' or '5 minutes later')",
      ),
    timeZone: z
      .string()
      .optional()
      .describe("The timezone to use for the task"),
    completed: z.boolean().optional().describe("Whether the task is completed"),
  }),
  execute: async ({
    taskId,
    title,
    priority,
    dueDate,
    dueTime,
    timeZone,
    completed,
  }: {
    taskId: string;
    title?: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
    dueDate?: string;
    dueTime?: string;
    timeZone?: string;
    completed?: boolean;
  }) => {
    try {
      console.log("Updating task with parameters:", {
        taskId,
        title,
        priority,
        dueDate,
        dueTime,
        timeZone,
        completed,
      });

      const user = await getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      // Get current date/time in the specified timezone using the existing tool
      const currentDateTime = getCurrentDateTime(timeZone);
      const now = new Date(currentDateTime.timestamp);

      // Handle relative time expressions for both date and time
      let targetDate: Date | undefined;
      let formattedTime: string | undefined;

      if (dueTime && dueTime.toLowerCase().includes("later")) {
        const relativeDate = parseRelativeTime(dueTime, timeZone);
        if (relativeDate) {
          targetDate = relativeDate;
          formattedTime = relativeDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone,
          });
        }
      } else {
        // Parse the date if provided
        if (dueDate) {
          try {
            targetDate = new Date(dueDate);
            if (isNaN(targetDate.getTime())) {
              throw new Error("Invalid date format");
            }
            // Validate and adjust date if it's in the past
            targetDate = validateDate(targetDate, timeZone);
          } catch (error) {
            throw new Error("Invalid date format");
          }
        }

        // Format the time if provided
        if (dueTime) {
          formattedTime = convertTo24HourFormat(dueTime);
          if (!formattedTime) {
            throw new Error(
              "Invalid time format. Please use either 24-hour format (HH:mm) or 12-hour format (h:mm AM/PM)",
            );
          }
        }
      }

      const updateData: {
        title?: string;
        priority?: "Low" | "Medium" | "High" | "Urgent";
        dueDate?: Date;
        dueTime?: string | null;
        completed?: boolean;
      } = {
        title,
        priority,
        dueDate: targetDate,
        dueTime: formattedTime || null,
        completed,
      };

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      // Only proceed if we have data to update
      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: "No valid fields to update",
        };
      }

      const updatedTask = await updateTask(taskId, updateData);
      revalidatePath("/");

      // Format the response
      const formattedTask = {
        id: updatedTask.id,
        title: updatedTask.title,
        priority: updatedTask.priority,
        dueDate: updatedTask.dueDate
          ? formatDate(new Date(updatedTask.dueDate))
          : null,
        dueTime: updatedTask.dueTime,
        completed: updatedTask.completed,
      };

      return {
        success: true,
        message: `Task "${updatedTask.title}" has been updated successfully${
          targetDate ? ` for ${formatDate(targetDate)}` : ""
        }${formattedTime ? ` at ${formattedTime}` : ""}`,
        task: formattedTask,
      };
    } catch (error: any) {
      console.error("Error in updateTaskTool:", error);
      return {
        success: false,
        error: `Failed to update task: ${error.message}`,
      };
    }
  },
});
