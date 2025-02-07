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
import { dateTimeTool, determineTargetTimezone } from "./services/dateTimeTool";
import { groq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { deepseek } from "@ai-sdk/deepseek";
const lmstudio = createOpenAICompatible({
  name: "lmstudio",
  baseURL: "http://localhost:1234/v1",
});

export const maxDuration = 300;

export async function POST(req: Request) {
  console.log("🚀 Chat API route handler started");

  const user = await getCurrentUser();
  if (!user) {
    console.log("❌ Authentication failed - no user found");
    return new Response("Unauthorized", { status: 401 });
  }
  console.log("✅ User authenticated:", user.id);

  try {
    const body = await req.json();
    console.log("📝 Received request body:", JSON.stringify(body, null, 2));

    const { messages } = body;
    const conversation = messages.slice(-4);
    const lastMessage = conversation[conversation.length - 1];

    // Get timezone from headers or body, with fallbacks
    const userTimeZone =
      req.headers.get("x-timezone") || body.timeZone || "UTC"; // Default to UTC if no timezone info is available

    // Determine target timezone based on the user's query
    const { targetTimeZone, isLocationSpecific } = determineTargetTimezone(
      lastMessage.content,
      userTimeZone,
    );

    console.log("🌍 User timezone:", userTimeZone);
    console.log(
      "🎯 Target timezone:",
      targetTimeZone,
      isLocationSpecific ? "(Location specific)" : "(User's timezone)",
    );

    const systemPrompt = `
      You are a task management assistant. Your role is to help manage tasks effectively and provide clear responses.

      CRITICAL TOOL USAGE RULES:
      1. You MUST use createTaskTool for ANY request to create/add a task, with these REQUIRED fields:
         - title: The exact task title as specified by the user
         - priority: "High" | "Medium" | "Low" (default to "Medium" if not specified)
         - dueDate: YYYY-MM-DD format (use today's date if not specified)
         - dueTime: HH:mm format (use "23:59" if not specified)
      
      2. You MUST use getTasksTool for ANY request to show/list/view/get tasks
      3. You MUST use deleteTaskTool when explicitly asked to delete/remove a task
      4. You MUST use searchTaskByTitleTool when searching for specific tasks
      5. You MUST use updateTaskTool when modifying existing tasks
      6. You MUST use dateTimeTool when:
         - User asks for current date/time
         - Need to get precise current time for task operations
         - Format options: "short" or "full" for date/time display
         - Can include/exclude seconds in time display
         - ALWAYS pass the appropriate timezone: "${targetTimeZone}"
         - For general time queries, use user's timezone
         - For location-specific queries, use the location's timezone

      RESPONSE FORMAT:
      1. ALWAYS call the appropriate tool for task operations
      2. After using any tool, provide a clear confirmation message about what was done
      3. Keep responses concise and focused on task management
      4. For task creation: Confirm the task details after creation
      5. For task listing: Summarize the tasks shown
      6. For date/time queries: Display in a clear, readable format with timezone information

    You must always respond in English, be as concise as possible, and ensure every response is the shortest possible while remaining logical. Always use tools for any task-related operations. This is a strict requirement.
    
      NEVER skip using tools when handling task-related requests.
      
      Current user's timezone: ${userTimeZone}
      ${isLocationSpecific ? `Target timezone for location: ${targetTimeZone}` : ""}
    `;

    return createDataStreamResponse({
      execute: async (dataStream) => {
        console.log("🎯 Starting AI stream generation");
        try {
          // First try with Ollama
          try {
            console.log("📡 Attempting to use Ollama model...");
            const result = await streamText({
              model: lmstudio("qwen2.5-7b-instruct-1m"),
              // model: deepseek("deepseek-chat"),
              // model: groq("gemma2-9b-it"),
              // model: lmstudio("qwen2-math-1.5b-instruct"),
              // model: lmstudio("deepseek-math-7b-instruct"),
              // model: lmstudio("qwen2-0.5b-instruct"),

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
                dateTimeTool,
              },
              maxTokens: 2000,
              temperature: 0.5,
              toolCallStreaming: true,
              toolChoice: "auto",
              maxSteps: 5,
              onStepFinish: async (event) => {
                console.log("🔄 Step finished event:", {
                  stepType: event.stepType,
                  hasText: !!event.text,
                  toolCallsCount: event.toolCalls?.length || 0,
                  finishReason: event.finishReason,
                  usage: event.usage,
                  responseText: event.text,
                });

                if (event.toolCalls?.length > 0) {
                  console.log(
                    "🛠️ Tool calls made:",
                    JSON.stringify(event.toolCalls, null, 2),
                  );
                } else if (event.stepType === "tool-result") {
                  console.warn("⚠️ Tool result step without any tool calls");
                }

                if (event.text) {
                  console.log("📤 Generated text:", event.text);
                }

                // Validate tool usage for task creation requests
                if (
                  event.text?.toLowerCase().includes("create") ||
                  event.text?.toLowerCase().includes("add") ||
                  event.text?.toLowerCase().includes("new task")
                ) {
                  if (
                    !event.toolCalls?.some(
                      (call) => call.toolName === "createTaskTool",
                    )
                  ) {
                    console.warn(
                      "⚠️ Task creation requested but createTaskTool not called",
                    );
                  }
                }
              },
              onFinish: async (result) => {
                console.log("✅ Stream generation finished", {
                  hasText: !!result.text,
                  textLength: result.text?.length,
                  finalText: result.text,
                });

                if (result.text) {
                  await saveMessageWithEmbedding(
                    user.id,
                    lastMessage.content,
                    "user",
                  );
                  await saveMessageWithEmbedding(
                    user.id,
                    result.text,
                    "assistant",
                  );
                  console.log("💾 Messages saved to database");
                } else {
                  console.warn("⚠️ No text generated in the result");
                  const fallbackResponse =
                    "Hello! I'm here to help you manage your tasks. How can I assist you today?";

                  await Promise.all([
                    saveMessageWithEmbedding(
                      user.id,
                      lastMessage.content,
                      "user",
                    ),
                    saveMessageWithEmbedding(
                      user.id,
                      fallbackResponse,
                      "assistant",
                    ),
                  ]);
                  dataStream.write(`0:${fallbackResponse}\n`);
                }
              },
            });
            console.log("🔄 Merging result into data stream");
            result.mergeIntoDataStream(dataStream);
          } catch (error) {
            console.error("❌ stream generation failed:", error);
            throw error;
          }
        } catch (streamError) {
          console.error("❌ Error in stream generation:", streamError);
          throw streamError;
        }
      },
      onError: (error: unknown) => {
        console.error("❌ Error generating response:", error);
        if (error instanceof Error) {
          return `An error occurred: ${error.message}`;
        }
        return "An error occurred while processing your request.";
      },
    });
  } catch (error) {
    console.error("❌ Fatal error in chat route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// Test Prompts to verify the flow of the tool calls

// 1. Create a task
// 2. List tasks
// 3. Update a task
// 4. Delete a task

// Test Prompt 1: Create a task
// 1. Create a task to buy groceries
// 2. Create a task go to the gym
// 3  Add a task
