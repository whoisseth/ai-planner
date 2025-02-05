import { createDataStreamResponse, streamText } from "ai";
import { getCurrentUser } from "@/lib/session";
import { saveMessageWithEmbedding } from "./services/embeddings";
import {
  createTaskTool,
  getTasksTool,
  deleteTaskTool,
  searchTaskByTitleTool,
  updateTaskTool,
} from "./services/taskTool";
import { groq } from "@ai-sdk/groq";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { messages } = await req.json();
    const conversation = messages.slice(-4);
    const lastMessage = conversation[conversation.length - 1];

    // Define the system prompt with clear instructions
    const systemPrompt = `
      You are a task management assistant. Your role is to help manage tasks effectively and provide clear responses.

      IMPORTANT RULES for using tools:
      - For viewing/listing tasks: ONLY use getTasksTool
      - For creating tasks: ONLY use createTaskTool
      - For deleting tasks: ONLY use deleteTaskTool when explicitly asked to delete/remove a task
      - For searching tasks: ONLY use searchTaskByTitleTool when searching for specific tasks
      - For updating tasks: ONLY use updateTaskTool when modifying existing tasks

      STRICT RULES:
      1. When user asks to "show", "list", "view", or "get" tasks - ONLY use getTasksTool
      2. NEVER use deleteTaskTool unless the user explicitly asks to delete/remove a task
      3. NEVER use updateTaskTool unless the user explicitly asks to modify/update a task

      RESPONSE FORMAT:
      1. After using any tool, always provide a clear confirmation message about what was done
      2. For task creation: Confirm the task was created and mention its details
      3. For task updates: Confirm the changes made
      4. For task deletion: Confirm what was deleted
      5. For task listing: Summarize the tasks shown

      Keep responses concise and focused on task management.
    `;

    // Create streaming response
    return createDataStreamResponse({
      execute: async (dataStream) => {
        const result = await streamText({
          model: groq("gemma2-9b-it"),
          messages: [
            { role: "system", content: systemPrompt },
            ...conversation,
          ],
          tools: {
            createTaskTool,
            getTasksTool,
            deleteTaskTool,
            searchTaskByTitleTool,
            updateTaskTool,
          },
          toolCallStreaming: true,
          maxSteps: 10,
          maxTokens: 1000,
          temperature: 0.7,
          topP: 0.8,

          onFinish: async (result) => {
            if (result.text) {
              await saveMessageWithEmbedding(
                user.id,
                lastMessage.content,
                "user",
              );
              await saveMessageWithEmbedding(user.id, result.text, "assistant");
            }
          },
        });
        result.mergeIntoDataStream(dataStream);
      },
      onError: (error: unknown) => {
        console.error("Error generating response:", error);
        return "An error occurred while processing your request.";
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
