import { ChatGroq } from "@langchain/groq";
import { createTask, updateTask } from "@/app/actions/tasks";
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

export class TaskAgent {
  private model: ChatGroq;
  private tools: Tool[];

  constructor(userId: number) {
    this.model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY || "",
      modelName: "mixtral-8x7b-32768",
    });

    this.tools = [new CreateTaskTool(userId)];
  }

  private async cleanTaskTitle(
    content: string,
  ): Promise<{ taskTitle: string; action: string }> {
    const systemPrompt = `You are an AI that extracts and cleans up task titles from user messages.
    Rules:
    1. Identify the main action verb (e.g., Buy, Call, Study) ONLY if it's clearly present
    2. If no clear action verb, leave action empty
    3. Correct spelling mistakes (e.g., "gosories" → "groceries")
    4. Keep important time-related information
    5. Use proper capitalization
    6. Remove unnecessary words like "a", "the", "task", "todo"
    
    Respond with JSON: { "action": "main action verb or empty if none", "taskTitle": "cleaned task details" }
    Examples:
    Input: "add a task buy a gosories"
    Output: { "action": "Buy", "taskTitle": "groceries" }
    
    Input: "create todo meeting with john"
    Output: { "action": "Meet", "taskTitle": "with John" }
    
    Input: "add task a random note" 
    Output: { "action": "", "taskTitle": "random note" }
    
    Input: "remind me about dentist appointment"
    Output: { "action": "", "taskTitle": "dentist appointment" }
    
    Input: "todo buy milk"
    Output: { "action": "Buy", "taskTitle": "milk" }`;

    const response = await this.model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ]);

    try {
      const parsed = JSON.parse(response.content.toString());
      // Additional validation to prevent single letter actions
      if (!parsed.action || parsed.action.length <= 1) {
        parsed.action = "";
      }
      return parsed;
    } catch (error) {
      console.error("Title cleaning error:", error);
      // Improved fallback cleaning
      const cleanedContent = content
        .replace(/^(add|create|task|todo|reminder|a|the)\s+/gi, "")
        .trim();
      return {
        action: "",
        taskTitle:
          cleanedContent.charAt(0).toUpperCase() + cleanedContent.slice(1),
      };
    }
  }

  private async analyzeIntent(
    content: string,
  ): Promise<{ isTaskCreation: boolean }> {
    const systemPrompt = `You are an AI assistant that analyzes user messages to determine if they want to create a task.
    Respond with JSON: { "isTaskCreation": true/false }
    Consider various ways users might express wanting to create a task, including indirect requests.`;

    const response = await this.model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ]);

    try {
      return JSON.parse(response.content.toString());
    } catch (error) {
      console.error("Intent analysis error:", error);
      return { isTaskCreation: false };
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

  async processMessage(content: string) {
    try {
      const intent = await this.analyzeIntent(content);

      if (intent.isTaskCreation) {
        const taskDetails = await this.analyzeTaskInput(content);
        const taskInput = JSON.stringify(taskDetails);
        return await this.tools[0].call(taskInput);
      } else {
        const response = await this.model.invoke([
          {
            role: "system",
            content: `You are a helpful AI assistant that specializes in task and time management. 
            Provide concise, practical responses. If users seem interested in task management, 
            mention that you can help them create tasks.`,
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
