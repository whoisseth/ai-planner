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
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

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

    console.log("💬 Processing conversation:", {
      conversationLength: conversation.length,
      lastMessage: lastMessage.content,
    });

    const systemPrompt = `
      You are a task management assistant. Your role is to help manage tasks effectively and provide clear responses.

      IMPORTANT RULES for using tools:
      - For viewing/listing tasks: ONLY use getTasksTool
      - For creating tasks: ONLY use createTaskTool with REQUIRED fields:
        * title: string
        * priority: "High" | "Medium" | "Low"
        * dueDate: string in "YYYY-MM-DD" format (use today's date if not specified)
        * dueTime: string in "HH:mm" format (use "23:59" if not specified)
      - For deleting tasks: ONLY use deleteTaskTool when explicitly asked to delete/remove a task
      - For searching tasks: ONLY use searchTaskByTitleTool when searching for specific tasks
      - For updating tasks: ONLY use updateTaskTool when modifying existing tasks

      STRICT RULES:
      1. When user asks to "show", "list", "view", or "get" tasks - ONLY use getTasksTool
      2. NEVER use deleteTaskTool unless the user explicitly asks to delete/remove a task
      3. NEVER use updateTaskTool unless the user explicitly asks to modify/update a task
      4. ALWAYS provide default values for dueDate (today) and dueTime (23:59) when creating tasks if not specified

      RESPONSE FORMAT:
      1. After using any tool, always provide a clear confirmation message about what was done
      2. For task creation: Confirm the task was created and mention its details
      3. For task updates: Confirm the changes made
      4. For task deletion: Confirm what was deleted
      5. For task listing: Summarize the tasks shown

      Keep responses concise, short as possible, simple, and focused on task management.
      YOU MUST ALWAYS RESPOND TO THE USER, even if just to acknowledge their greeting
      You must always give response in english.
    `;

    return createDataStreamResponse({
      execute: async (dataStream) => {
        console.log("🎯 Starting AI stream generation");
        try {
          // First try with Ollama
          try {
            console.log("📡 Attempting to use Ollama model...");
            const result = await streamText({
              // model: groq("gemma2-9b-it"),
              model: lmstudio("qwen2.5-7b-instruct-1m"),
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
              },
              maxTokens: 2000,
              temperature: 0.7,
              toolCallStreaming: true,
              toolChoice: "required",
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
                }

                if (event.text) {
                  console.log("📤 Generated text:", event.text);
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
                  await saveMessageWithEmbedding(
                    user.id,
                    lastMessage.content,
                    "user",
                  );
                  await saveMessageWithEmbedding(
                    user.id,
                    fallbackResponse,
                    "assistant",
                  );
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
