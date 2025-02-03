import { z } from "zod";
import { createTask, getTasks, deleteTask, searchTaskByTitle, updateTask } from "@/app/actions/tasks";
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

// Add this new tool after the existing tools
export const deleteTaskTool = tool({
  type: "function",
  description: "Delete a task by searching for its title first and then deleting by ID",
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
  description: "Search for tasks by title",
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
  description: "Update an existing task's details",
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


