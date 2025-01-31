// src/app/api/chat/ai/route.ts
import { groq } from "@ai-sdk/groq";
import { generateText, tool } from "ai";
import { z } from "zod";
import { createTask } from "@/app/actions/tasks";
import { Message } from "ai";
import { getCurrentUser } from "@/lib/session";

// Define the task creation tool
const createTaskTool = {
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
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const taskData = {
      title,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      dueTime: dueTime || null,
      completed: false,
    };

    const task = await createTask(taskData);
    return {
      success: true,
      message: `Task "${title}" created successfully`,
      task,
    };
  },
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // Create a new TransformStream for streaming responses
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Function to send a streaming message
    const sendStream = async (content: string, isComplete = false) => {
      const data = {
        content,
        isComplete,
        isStreaming: !isComplete,
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    // Process the response in the background
    (async () => {
      try {
        // Generate response using Groq
        const response = await generateText({
          model: groq("llama-3.3-70b-versatile"),
          messages: messages as Message[],
          tools: {
            createTask: tool(createTaskTool),
          },
          maxSteps: 5,
          temperature: 0.7,
        });

        // Stream the response
        await sendStream(response.text, true);
        console.log("response.text", response.text);
        await writer.close();
      } catch (error) {
        console.error("Error generating response:", error);
        const errorMessage = "Failed to generate response";
        await sendStream(errorMessage, true);
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in AI chat:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
