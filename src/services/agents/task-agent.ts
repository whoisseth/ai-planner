import { ChatGroq } from "@langchain/groq";
import { createTask, updateTask, getTasks } from "@/app/actions/tasks";
import { Tool } from "@langchain/core/tools";
import { revalidatePath } from "next/cache";

class CreateTaskTool extends Tool {
  name = "create_task";
  description = "Create a task with title, priority, and due date/time.";

  constructor(private userId: number) {
    super();
  }

  async _call(input: string) {
    try {
      const { title, dueDate, dueTime, priority } = JSON.parse(input);

      const task = await createTask({
        title: title.trim(),
        priority: priority || "Medium",
        completed: false,
        dueDate: dueDate ? new Date(dueDate) : null,
        dueTime: dueTime || null,
      });

      console.log("Task created successfully:", task.title);
      revalidatePath("/");
      return `✅ Task created successfully: "${title}"`;
    } catch (error) {
      console.error("Task creation error:", error);
      return "Failed to create task. Please try again.";
    }
  }
}

class GetTasksTool extends Tool {
  name = "get_tasks";
  description = "List tasks from the database with optional date filtering";

  constructor(private userId: number) {
    super();
  }

  private getDateFromFilter(dateFilter: string): Date | null {
    if (!dateFilter) return null;

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
  }

  async _call(input: string) {
    try {
      console.log("GetTasksTool: Starting to fetch tasks...");
      const { date: dateFilter } = JSON.parse(input);
      console.log("GetTasksTool: Date filter:", dateFilter);

      const tasks = await getTasks();
      console.log("GetTasksTool: Raw tasks from database:", tasks);

      let filteredTasks = tasks;

      // Filter by date if specified
      if (dateFilter) {
        const targetDate = this.getDateFromFilter(dateFilter);
        if (targetDate) {
          console.log("GetTasksTool: Filtering for date:", targetDate);
          filteredTasks = tasks.filter((task) => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === targetDate.toDateString();
          });
        }
      }

      const formattedTasks = filteredTasks.map((task) => ({
        title: task.title,
        status: task.completed ? "completed" : "active",
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toLocaleDateString() : null,
        dueTime: task.dueTime || null,
      }));

      console.log(
        "GetTasksTool: Filtered and formatted tasks:",
        formattedTasks,
      );
      return JSON.stringify(formattedTasks);
    } catch (error) {
      console.error("GetTasksTool: Error fetching tasks:", error);
      return "Failed to retrieve tasks";
    }
  }
}

export class TaskAgent {
  private model: ChatGroq;
  private tools: Tool[];

  constructor(userId: number) {
    this.model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY || "",
      modelName: "mixtral-8x7b-32768",
    });

    this.tools = [new CreateTaskTool(userId), new GetTasksTool(userId)];
  }

  private async analyzeIntent(content: string): Promise<{
    action: "create" | "list" | "none";
    filter?: string;
    date?: string;
  }> {
    const systemPrompt = `You are an AI assistant that analyzes user messages to determine their intent.
    Respond with JSON containing action and optional date filter.
    Examples:
    - "show me today's tasks" → { "action": "list", "date": "today" }
    - "what tasks do I have tomorrow" → { "action": "list", "date": "tomorrow" }
    - "show tasks for next monday" → { "action": "list", "date": "next monday" }
    - "show all my tasks" → { "action": "list" }
    
    Respond with JSON:
    {
      "action": "create/list/none",
      "date": "today/tomorrow/next monday/etc" (optional)
    }`;

    console.log("Analyzing intent for message:", content);
    const response = await this.model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ]);

    try {
      const intent = JSON.parse(response.content.toString());
      console.log("Analyzed intent:", intent);
      return intent;
    } catch (error) {
      console.error("Intent analysis error:", error);
      return { action: "none" };
    }
  }

  private async analyzeTaskInput(content: string) {
    // Get current date in local timezone
    const now = new Date();
    const currentDate = now.toLocaleDateString("en-CA");

    const systemPrompt = `You are an AI that analyzes task details from user messages.
    Current date and time reference:
    - Today's exact date is: ${currentDate}
    - For "today" tasks, use exactly: ${currentDate}
    - For "tomorrow" tasks, use: ${new Date(now.setDate(now.getDate() + 1)).toLocaleDateString("en-CA")}

    Extract and format the following information:
    1. Task title formatting:
      - Correct spelling mistakes (e.g., "grocerys" → "groceries", "homwork" → "homework")
      - Capitalize the first letter of each significant word
      - Remove filler words like "a", "the", "task", "todo", "reminder"
      - Keep important context words and details
    2. Due date handling:
      - For "today" → use exactly ${currentDate}
      - For relative dates, calculate from ${currentDate}
    3. Due time (convert to 24-hour HH:mm format)
    4. Priority level (map words like "urgent", "important" to: Urgent, High, Medium, Low)

    Respond with JSON only:
    {
      "title": "clean task title with proper capitalization and spelling",
      "dueDate": "YYYY-MM-DD or null",
      "dueTime": "HH:mm or null",
      "priority": "Urgent/High/Medium/Low or null"
    }

    Examples:
    Input: "create a task go for mornin wlk in today morning make priority low"
    Output: {
      "title": "Go for Morning Walk",
      "dueDate": "${currentDate}",
      "dueTime": "07:00",
      "priority": "Low"
    }

    Input: "add task buy groseries from store"
    Output: {
      "title": "Buy Groceries from Store",
      "dueDate": null,
      "dueTime": null,
      "priority": "Medium"
    }

    Input: "do math homwork tomorrow"
    Output: {
      "title": "Do Math Homework",
      "dueDate": "${new Date(now.setDate(now.getDate() + 1)).toLocaleDateString("en-CA")}",
      "dueTime": null,
      "priority": "Medium"
    }`;

    const response = await this.model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ]);

    try {
      return JSON.parse(response.content.toString());
    } catch (error) {
      console.error("Task analysis error:", error);
      return {
        title: content
          .replace(/^(add|create|task|todo|reminder|a|the)\s+/gi, "")
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ")
          .trim(),
        dueDate: null,
        dueTime: null,
        priority: "Medium",
      };
    }
  }

  private formatTaskList(tasks: any[]): string {
    console.log("Formatting task list, received tasks:", tasks);

    if (tasks.length === 0) {
      return "📝 No tasks yet. Want to create one?";
    }

    let response = `## Your Tasks\n\n`;

    // Add priority legend
    response += `**Priority Level:**\n`;
    response += `🔴 Urgent • 🟠 High • 🟡 Medium • 🟢 Low\n\n`;

    // Group tasks by status
    const activeTasks = tasks.filter((task) => task.status !== "completed");
    const completedTasks = tasks.filter((task) => task.status === "completed");

    // Sort active tasks by due date and priority
    activeTasks.sort((a, b) => {
      // Priority order for sorting (highest to lowest)
      const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

      // If neither task has a due date, sort by priority
      if (!a.dueDate && !b.dueDate) {
        return (
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder]
        );
      }

      // Tasks with due dates come before tasks without due dates
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      // Sort by date first
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }

      // If dates are equal, sort by time if exists
      if (a.dueTime && b.dueTime) {
        return a.dueTime.localeCompare(b.dueTime);
      }

      // Tasks with time come before tasks without time
      if (a.dueTime) return -1;
      if (b.dueTime) return 1;

      // If dates are equal and neither has time, sort by priority
      return (
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder]
      );
    });

    // Sort completed tasks by most recently completed (if you have a completedAt field)
    // completedTasks.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    const prioritySymbols = {
      Urgent: "🔴",
      High: "🟠",
      Medium: "🟡",
      Low: "🟢",
    };

    // Helper function to format date
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return "Today";
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return "Tomorrow";
      } else {
        return date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        });
      }
    };

    // Helper function to format time
    const formatTime = (timeStr: string) => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes}${ampm}`;
    };

    // Format active tasks
    if (activeTasks.length > 0) {
      response += "### Active\n";
      activeTasks.forEach((task) => {
        const priority =
          prioritySymbols[task.priority as keyof typeof prioritySymbols];
        let taskLine = `${priority} ${task.title}`;
        if (task.dueDate) {
          const formattedDate = formatDate(task.dueDate);
          const formattedTime = task.dueTime ? formatTime(task.dueTime) : null;
          const due = formattedTime
            ? `⏰ ${formattedDate} at ${formattedTime}`
            : `📅 ${formattedDate}`;
          taskLine += ` *(${due})*`;
        }
        response += `- ${taskLine}\n`;
      });
      response += "\n";
    }

    // Format completed tasks
    if (completedTasks.length > 0) {
      response += `### Completed (${completedTasks.length})\n`;
      response += "<details><summary>Show completed tasks</summary>\n\n";
      completedTasks.forEach((task) => {
        response += `- ✅ ${task.title}\n`;
      });
      response += "</details>\n";
    }

    return response;
  }

  async processMessage(content: string) {
    try {
      console.log("Processing message:", content);
      const intent = await this.analyzeIntent(content);

      if (intent.action === "create") {
        console.log("Creating new task...");
        const taskDetails = await this.analyzeTaskInput(content);
        const taskInput = JSON.stringify(taskDetails);
        return await this.tools[0].call(taskInput);
      } else if (intent.action === "list") {
        console.log("Fetching task list...");
        const tasksResult = await this.tools[1].call(
          JSON.stringify({
            date: intent.date,
          }),
        );
        console.log("Raw tasks result:", tasksResult);

        const tasks = JSON.parse(tasksResult);
        if (tasks.length === 0 && intent.date) {
          return `No tasks found for ${intent.date}.`;
        }
        return this.formatTaskList(tasks);
      } else {
        console.log("No specific task action detected");
        const response = await this.model.invoke([
          {
            role: "system",
            content: `You are a helpful AI assistant that specializes in task management. 
            Provide concise responses. Mention that you can help create tasks or show tasks for specific dates.`,
          },
          { role: "user", content },
        ]);

        return response.content;
      }
    } catch (error) {
      console.error("Message processing error:", error);
      return "I encountered an error processing your message. Please try again.";
    }
  }
}
