import { ChatGroq } from "@langchain/groq";
import { createTask, updateTask } from "@/app/actions/tasks";
import { Tool } from "@langchain/core/tools";
import { revalidatePath } from "next/cache";

class CreateTaskTool extends Tool {
  name = "create_task";
  description = "Create a task with title and optional due date/time. Use this when users want to create tasks.";

  constructor(private userId: number) {
    super();
  }

  async _call(input: string) {
    try {
      const { title, action } = JSON.parse(input);
      // Combine action and title without colon, only if action exists
      const taskTitle = action && action.length > 1 ? 
        `${action} ${title}`.trim() : 
        title.trim();

      const task= await createTask({
        title: taskTitle,
        priority: "Medium",
        completed: false,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        dueTime: "09:00",
      });
      console.log("Task created successfully:", task.title);
      revalidatePath("/");
      return `✅ Task created successfully: "${taskTitle}"`;
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
      apiKey: process.env.GROQ_API_KEY || '',
      modelName: "mixtral-8x7b-32768",
    });

    this.tools = [
      new CreateTaskTool(userId),
    ];
  }

  private async cleanTaskTitle(content: string): Promise<{ taskTitle: string, action: string }> {
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
    Output: { "action": "", "taskTitle": "dentist appointment" }`;

    const response = await this.model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content }
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
        .replace(/^(add|create|task|todo|reminder|a|the)\s+/gi, '')
        .trim();
      return { 
        action: "",
        taskTitle: cleanedContent.charAt(0).toUpperCase() + cleanedContent.slice(1)
      };
    }
  }

  private async analyzeIntent(content: string): Promise<{ isTaskCreation: boolean }> {
    const systemPrompt = `You are an AI assistant that analyzes user messages to determine if they want to create a task.
    Respond with JSON: { "isTaskCreation": true/false }
    Consider various ways users might express wanting to create a task, including indirect requests.`;

    const response = await this.model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content }
    ]);

    try {
      return JSON.parse(response.content.toString());
    } catch (error) {
      console.error("Intent analysis error:", error);
      return { isTaskCreation: false };
    }
  }

  async processMessage(content: string) {
    try {
      const intent = await this.analyzeIntent(content);

      if (intent.isTaskCreation) {
        const { taskTitle, action } = await this.cleanTaskTitle(content);
        const taskInput = JSON.stringify({ title: taskTitle, action });
        return await this.tools[0].call(taskInput);
      } else {
        const response = await this.model.invoke([
          { 
            role: "system", 
            content: `You are a helpful AI assistant that specializes in task and time management. 
            Provide concise, practical responses. If users seem interested in task management, 
            mention that you can help them create tasks.` 
          },
          { role: "user", content }
        ]);

        return response.content;
      }
    } catch (error) {
      console.error("Message processing error:", error);
      return "I encountered an error processing your message. Please try again.";
    }
  }
} 