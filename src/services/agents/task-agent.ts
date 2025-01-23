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
  description = "List all tasks from the database";

  constructor(private userId: number) {
    super();
  }

  async _call(input: string) {
    try {
      console.log("GetTasksTool: Starting to fetch tasks...");
      const tasks = await getTasks();
      console.log("GetTasksTool: Raw tasks from database:", tasks);

      const formattedTasks = tasks.map((task) => ({
        title: task.title,
        status: task.completed ? "completed" : "active",
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toLocaleDateString() : null,
        dueTime: task.dueTime || null,
      }));

      console.log("GetTasksTool: Formatted tasks:", formattedTasks);
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

  private async analyzeIntent(
    content: string,
  ): Promise<{ action: "create" | "list" | "none" }> {
    const systemPrompt = `You are an AI assistant that analyzes user messages to determine their intent.
    Respond with JSON: { "action": "create/list/none" }
    Examples:
    - "create a task to buy groceries" → { "action": "create" }
    - "show me my tasks" → { "action": "list" }
    - "what tasks do I have" → { "action": "list" }
    - "list all my tasks" → { "action": "list" }`;

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
      return "You don't have any tasks yet. Would you like to create one?";
    }

    let response = `📋 Here are your tasks:\n\n`;
    tasks.forEach((task, index) => {
      const status = task.status === "completed" ? "✅" : "⏳";
      const priority = `[${task.priority}]`;
      let dueInfo = "";
      if (task.dueDate) {
        dueInfo += ` (Due: ${task.dueDate}`;
        if (task.dueTime) {
          dueInfo += ` at ${task.dueTime}`;
        }
        dueInfo += ")";
      }
      response += `${index + 1}. ${status} ${task.title} ${priority}${dueInfo}\n`;
    });

    console.log("Formatted response:", response);
    return (
      response +
      "\nLet me know if you want to add, update, or complete any tasks."
    );
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
        const tasksResult = await this.tools[1].call("");
        console.log("Raw tasks result:", tasksResult);

        const tasks = JSON.parse(tasksResult);
        return this.formatTaskList(tasks);
      } else {
        console.log("No specific task action detected");
        const response = await this.model.invoke([
          {
            role: "system",
            content: `You are a helpful AI assistant that specializes in task management. 
            Provide concise responses. Mention that you can help create tasks or show existing tasks.`,
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
