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

// Helper functions for date and time formatting
const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Helper function to convert 12-hour time to 24-hour format
const convertTo24HourFormat = (time: string): string => {
  // Handle empty or invalid input
  if (!time) return "";

  try {
    // Parse time components
    const [timePart, meridiem] = time.toUpperCase().split(" ");
    let [hours, minutes] = timePart.split(":").map((num) => parseInt(num));

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

// Define the task creation tool
export const createTaskTool = tool({
  type: "function",
  description:
    "Creates and schedules new tasks with customizable title, priority, due date, and time while supporting reminders and task organization.",
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
          completed: task.completed,
        },
      };

      return formattedResponse;
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
    "Returns tasks based on user's request - can show all tasks or filter by specific conditions like showing only today's tasks, tomorrow's tasks, or tasks for a specific date. Also supports filtering by completion status.",
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
        error: `Failed to get tasks: ${error.message}`,
      };
    }
  },
});

// Add this new tool after the existing tools
export const deleteTaskTool = tool({
  type: "function",
  description:
    "Removes tasks from the task list using intelligent title-based search to find and delete the most relevant matching task.",
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
      throw new Error(`Failed to delete task: ${error.message}`);
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
      .describe("New due date for the task in YYYY-MM-DD format"),
    dueTime: z
      .string()
      .optional()
      .describe("New due time for the task in HH:mm format"),
    completed: z.boolean().optional().describe("Whether the task is completed"),
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

      const updateData: {
        title?: string;
        priority?: "Low" | "Medium" | "High" | "Urgent";
        dueDate?: Date;
        dueTime?: string;
        completed?: boolean;
      } = {
        title,
        priority,
        dueDate: parsedDate,
        completed,
      };

      if (dueTime) {
        const formattedTime = convertTo24HourFormat(dueTime);
        if (formattedTime) {
          updateData.dueTime = formattedTime;
        } else {
          throw new Error(
            "Invalid time format. Please provide time in '1:30 PM' or '13:30' format",
          );
        }
      }

      // Remove undefined values
      (Object.keys(updateData) as Array<keyof typeof updateData>).forEach(
        (key) => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        },
      );

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
        subtasks: updatedTask.subtasks,
      };

      console.log("Updated task:", formattedTask);

      return {
        success: true,
        message: "Task updated successfully",
        task: formattedTask,
      };
    } catch (error: any) {
      console.error("Error in updateTaskTool:", error);
      return {
        success: false,
        error: error.message || "Failed to update task",
      };
    }
  },
});

// export const allTools = {
//   createTaskTool,
//   getTasksTool,
//   deleteTaskTool,
//   searchTaskByTitleTool,
//   updateTaskTool,
// };
