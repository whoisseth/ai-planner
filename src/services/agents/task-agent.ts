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
        id: task.id,
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

class UpdateTaskTool extends Tool {
  name = "update_task";
  description =
    "Update an existing task's details (title, priority, due date, completion status)";

  constructor(private userId: number) {
    super();
  }

  async _call(input: string) {
    try {
      console.log("UpdateTaskTool: Starting to update task with input:", input);
      const updateData = JSON.parse(input);
      console.log("UpdateTaskTool: Parsed update data:", updateData);

      if (!updateData.taskId) {
        throw new Error("Task ID is required for updates");
      }

      // Get the current task first
      const tasks = await getTasks();
      const currentTask = tasks.find((t) => t.id === updateData.taskId);
      if (!currentTask) {
        throw new Error(`Task with ID ${updateData.taskId} not found`);
      }
      console.log("UpdateTaskTool: Found current task:", currentTask);

      // Prepare update data
      const finalUpdateData: any = {};

      // Only include fields that are actually changing and have valid values
      if (updateData.title && updateData.title !== currentTask.title) {
        finalUpdateData.title = updateData.title.trim();
      }
      if (updateData.priority && updateData.priority !== currentTask.priority) {
        finalUpdateData.priority = updateData.priority;
      }
      if (updateData.dueDate !== undefined) {
        finalUpdateData.dueDate = updateData.dueDate
          ? new Date(updateData.dueDate)
          : null;
      }
      if (updateData.dueTime !== undefined) {
        finalUpdateData.dueTime = updateData.dueTime;
      }
      if (
        updateData.completed !== undefined &&
        updateData.completed !== currentTask.completed
      ) {
        finalUpdateData.completed = updateData.completed;
      }

      console.log("UpdateTaskTool: Final update data:", finalUpdateData);

      if (Object.keys(finalUpdateData).length === 0) {
        return "No changes needed for the task.";
      }

      const updatedTask = await updateTask(updateData.taskId, finalUpdateData);
      if (!updatedTask) {
        throw new Error("Failed to update task in database");
      }
      console.log("UpdateTaskTool: Task updated successfully:", updatedTask);

      // Prepare success message
      let message = `✅ Task updated successfully: "${updatedTask.title}"`;
      const changes: string[] = [];

      if (finalUpdateData.title) changes.push("title updated");
      if (finalUpdateData.priority)
        changes.push(`priority set to ${finalUpdateData.priority}`);
      if (finalUpdateData.dueDate)
        changes.push(
          `due date set to ${new Date(finalUpdateData.dueDate).toLocaleDateString()}`,
        );
      if (finalUpdateData.dueTime)
        changes.push(`time set to ${finalUpdateData.dueTime}`);
      if (finalUpdateData.completed !== undefined)
        changes.push(
          finalUpdateData.completed
            ? "marked as completed"
            : "marked as not completed",
        );

      if (changes.length > 0) {
        message += ` (${changes.join(", ")})`;
      }

      revalidatePath("/");
      return message;
    } catch (error) {
      console.error("UpdateTaskTool: Error updating task:", error);
      if (error instanceof Error) {
        return `Failed to update task: ${error.message}`;
      }
      return "Failed to update task. Please try again with valid task details.";
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

    this.tools = [
      new CreateTaskTool(userId),
      new GetTasksTool(userId),
      new UpdateTaskTool(userId),
    ];
  }

  private async analyzeIntent(content: string): Promise<{
    action: "create" | "list" | "update" | "none";
    filter?: string;
    date?: string;
    taskUpdate?: {
      taskId?: number;
      title?: string;
      priority?: string;
      dueDate?: string;
      dueTime?: string;
      completed?: boolean;
    };
  }> {
    const systemPrompt = `You are an AI assistant that analyzes user messages to determine their intent.
    Respond with JSON containing action and relevant details.
    Examples:
    - "show me today's tasks" → { "action": "list", "date": "today" }
    - "mark task 'Go for Walk' as completed" → { "action": "update", "taskUpdate": { "title": "Go for Walk", "completed": true } }
    - "update Go for Walk task to tomorrow" → { "action": "update", "taskUpdate": { "title": "Go for Walk", "dueDate": "tomorrow" } }
    - "change the time for task Go for Walk to 5am" → { "action": "update", "taskUpdate": { "title": "Go for Walk", "dueTime": "05:00" } }
    - "update the task Go for Walk to tomorrow 5am" → { "action": "update", "taskUpdate": { "title": "Go for Walk", "dueDate": "tomorrow", "dueTime": "05:00" } }
    - "make Go for Walk task urgent" → { "action": "update", "taskUpdate": { "title": "Go for Walk", "priority": "Urgent" } }
    
    Respond with JSON:
    {
      "action": "create/list/update/none",
      "date": "today/tomorrow/etc" (optional),
      "taskUpdate": {
        "taskId": number (optional),
        "title": string (for finding task by title),
        "priority": "Urgent/High/Medium/Low",
        "dueDate": "date string",
        "dueTime": "HH:mm",
        "completed": boolean
      } (for update action)
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

  private findTaskByTitle(searchTitle: string, tasks: any[]): string | null {
    if (!searchTitle || !tasks.length) return null;

    // Clean up the search title - remove quotes and extra spaces
    const cleanSearchTitle = searchTitle
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "");
    console.log("Searching for task with title:", cleanSearchTitle);

    // First try exact match (case insensitive)
    const exactMatch = tasks.find(
      (task) => task.title.toLowerCase().trim() === cleanSearchTitle,
    );
    if (exactMatch) {
      console.log(
        "Found exact match:",
        exactMatch.title,
        "with ID:",
        exactMatch.id,
      );
      return exactMatch.id;
    }

    // Then try contains match
    const containsMatch = tasks.find(
      (task) =>
        task.title.toLowerCase().includes(cleanSearchTitle) ||
        cleanSearchTitle.includes(task.title.toLowerCase()),
    );
    if (containsMatch) {
      console.log(
        "Found contains match:",
        containsMatch.title,
        "with ID:",
        containsMatch.id,
      );
      return containsMatch.id;
    }

    // Try matching individual words
    const searchWords = cleanSearchTitle
      .split(" ")
      .filter((word) => word.length > 1);
    const partialMatch = tasks.find((task) => {
      const taskWords = task.title.toLowerCase().split(" ");
      const matches = searchWords.some((word) =>
        taskWords.some(
          (taskWord: string) =>
            taskWord.includes(word) || word.includes(taskWord),
        ),
      );
      return matches;
    });
    if (partialMatch) {
      console.log(
        "Found partial match:",
        partialMatch.title,
        "with ID:",
        partialMatch.id,
      );
      return partialMatch.id;
    }

    console.log("No matching task found");
    return null;
  }

  private async analyzeTaskUpdate(content: string, tasks: any[]) {
    console.log("\n=== Starting Task Update Analysis ===");
    console.log("Input content:", content);
    console.log(
      "Available tasks with IDs:",
      tasks.map(
        (t: {
          id: string;
          title: string;
          priority: string;
          completed: boolean;
        }) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          completed: t.completed,
        }),
      ),
    );

    const systemPrompt = `You are an AI that analyzes task update details from user messages.
    Extract update information from the message, including any changes to title, date, time, priority, or completion status.
    
    Available tasks:
    ${tasks.map((t) => `- "${t.title}" (ID: ${t.id})`).join("\n")}

    When analyzing updates:
    1. For title changes:
       - Match partial titles (e.g., "clean living room" matches "Clean Living Room, Dust, Sweep")
       - Clean and capitalize new titles
    2. For time/date:
       - Convert relative dates (e.g., "tomorrow") to actual dates
       - Convert times to 24-hour format (HH:mm)
    
    Return JSON with:
    {
      "searchTitle": "current title to find the task (can be partial)",
      "updates": {
        "title": "new title if changing",
        "priority": "Urgent/High/Medium/Low" (if changing priority),
        "dueDate": "YYYY-MM-DD" (if changing date),
        "dueTime": "HH:mm" (if changing time),
        "completed": boolean (if marking complete/incomplete)
      }
    }

    Examples:
    Input: "update the time for task 'clean living room' to clean guest room and set time for tomorrow"
    Output: {
      "searchTitle": "clean living room",
      "updates": {
        "title": "Clean Guest Room",
        "dueDate": "tomorrow",
        "dueTime": "09:00"
      }
    }

    Input: "change go for walk to morning run at 7am"
    Output: {
      "searchTitle": "Go for Walk",
      "updates": {
        "title": "Morning Run",
        "dueTime": "07:00"
      }
    }`;

    const response = await this.model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ]);

    try {
      const result = JSON.parse(response.content.toString());
      console.log("LLM Analysis Result:", result);

      // Find the task ID using the helper method
      const taskId = this.findTaskByTitle(result.searchTitle, tasks);
      console.log("Task ID found:", taskId);
      console.log("For search title:", result.searchTitle);

      if (!taskId) {
        console.log("No task ID found for title:", result.searchTitle);
        return null;
      }

      // Get the current task for reference
      const currentTask = tasks.find((t) => t.id === taskId);
      console.log("Current task details:", currentTask);

      // Handle date updates
      if (result.updates.dueDate === "tomorrow") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        result.updates.dueDate = tomorrow.toISOString().split("T")[0];
      }

      // If time isn't specified but date is updated to tomorrow, use a default morning time
      if (result.updates.dueDate && !result.updates.dueTime) {
        result.updates.dueTime = "09:00";
      }

      // Convert time format if needed (e.g., "6am" to "06:00")
      if (result.updates.dueTime) {
        const timeMatch = result.updates.dueTime.match(
          /(\d+)(?::(\d+))?\s*(am|pm)?/i,
        );
        if (timeMatch) {
          let [_, hours, minutes = "00", ampm] = timeMatch;
          hours = parseInt(hours);
          if (ampm?.toLowerCase() === "pm" && hours < 12) hours += 12;
          if (ampm?.toLowerCase() === "am" && hours === 12) hours = 0;
          result.updates.dueTime = `${hours.toString().padStart(2, "0")}:${minutes}`;
        }
      }

      // Clean up the new title if provided
      if (result.updates.title) {
        result.updates.title = result.updates.title
          .split(" ")
          .map(
            (word: string) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ")
          .trim();
      }

      const updateData = {
        taskId,
        ...result.updates,
      };
      console.log("Final update data to be sent:", updateData);
      return updateData;
    } catch (error) {
      console.error("Task update analysis error:", error);
      return null;
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
      console.log("\n=== Processing Message ===");
      console.log("Input content:", content);
      const intent = await this.analyzeIntent(content);
      console.log("Analyzed intent:", intent);

      switch (intent.action) {
        case "create":
          console.log("Creating new task...");
          const taskDetails = await this.analyzeTaskInput(content);
          const taskInput = JSON.stringify(taskDetails);
          return await this.tools[0].call(taskInput);

        case "list":
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

        case "update":
          console.log("\n=== Processing Update Request ===");
          // First get all tasks to find the one to update
          const allTasksResult = await this.tools[1].call(JSON.stringify({}));
          const allTasks = JSON.parse(allTasksResult);
          console.log(
            "All available tasks:",
            allTasks.map(
              (t: {
                id: string;
                title: string;
                priority: string;
                completed: boolean;
              }) => ({
                id: t.id,
                title: t.title,
                priority: t.priority,
                completed: t.completed,
              }),
            ),
          );

          let updateData;
          if (intent.taskUpdate?.taskId) {
            // If we have a direct task ID, use it
            updateData = intent.taskUpdate;
            console.log("Using direct task ID:", updateData);
          } else if (intent.taskUpdate?.title) {
            // If we have a title, analyze the update and find the matching task
            const taskUpdate = await this.analyzeTaskUpdate(content, allTasks);
            console.log("Task update analysis result:", taskUpdate);

            if (!taskUpdate) {
              // Try direct title match first
              const taskId = this.findTaskByTitle(
                intent.taskUpdate.title,
                allTasks,
              );
              console.log(
                "Direct title match attempt - Title:",
                intent.taskUpdate.title,
                "Found ID:",
                taskId,
              );

              if (taskId) {
                updateData = {
                  taskId,
                  ...intent.taskUpdate,
                };
                delete updateData.title; // Remove title from updates
                console.log("Using direct title match data:", updateData);
              } else {
                console.log(
                  "No task found with title:",
                  intent.taskUpdate.title,
                );
                return `I couldn't find that task. Available tasks are:\n${allTasks.map((t: any, i: number) => `${i + 1}. "${t.title}" (ID: ${t.id})`).join("\n")}\nPlease try again with the exact task name.`;
              }
            } else {
              updateData = taskUpdate;
              console.log("Using analyzed task update data:", updateData);
            }
          }

          if (!updateData?.taskId) {
            console.log("No task ID found in update data");
            return "Please specify which task you want to update.";
          }

          console.log("Sending update with data:", updateData);
          const updateResult = await this.tools[2].call(
            JSON.stringify(updateData),
          );
          console.log("Update result:", updateResult);

          // After successful update, show the updated task list
          const updatedTasksResult = await this.tools[1].call(
            JSON.stringify({}),
          );
          const updatedTasks = JSON.parse(updatedTasksResult);
          return `${updateResult}\n\n${this.formatTaskList(updatedTasks)}`;

        default:
          console.log("No specific task action detected");
          const response = await this.model.invoke([
            {
              role: "system",
              content: `You are a helpful AI assistant that specializes in task management. 
              Provide concise responses. Mention that you can help create, update, or show tasks.`,
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
