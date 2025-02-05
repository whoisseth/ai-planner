/**
 * Main route handler for AI chat functionality
 * This file serves as the entry point for chat-related API requests
 */
// src/app/api/chat/ai/route.ts

import { createDataStreamResponse, smoothStream, streamText } from "ai";
import { groq } from "@ai-sdk/groq";
import { getCurrentUser } from "@/lib/session";
import { SYSTEM_PROMPTS } from "./constants/chatConstants";
import {
  saveMessageWithEmbedding,
  getRelevantContext,
} from "./services/embeddings";
import {
  createTaskTool,
  deleteTaskTool,
  getTasksTool,
  searchTaskByTitleTool,
  updateTaskTool,
} from "./services/taskTool";

interface APIError extends Error {
  statusCode?: number;
  responseHeaders?: Record<string, string>;
}

// Exponential backoff retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const apiError = error as APIError;
      if (apiError?.statusCode === 429) {
        const retryAfter = parseInt(
          apiError?.responseHeaders?.["retry-after"] || "1",
        );
        const delay = Math.max(
          retryAfter * 1000,
          baseDelay * Math.pow(2, attempt - 1),
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function POST(req: Request) {
  // Authenticate user
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // Need to use this when we have a vector db
    // const context = await getRelevantContext(user.id, lastMessage.content);
    const context = "";
    console.log("messages : ", messages);

    // Create streaming response
    return createDataStreamResponse({
      execute: async (dataStream) => {
        const result = await withRetry(async () => {
          const streamResult = await streamText({
            // model: groq("gemma2-9b-it"), // Using smaller model with higher rate limits
            model: groq("llama-3.1-8b-instant"), // Using smaller model with higher rate limits
            messages: [
              {
                role: "system",
                content:
                  `You are a task management assistant with the following capabilities:
              - createTaskTool: Create new tasks
              - getTasksTool: List and filter tasks. When using getTasksTool:
                * For "show all tasks" or similar requests, do not specify any dateFilter
                * Only use dateFilter when user explicitly asks for tasks on a specific date
                * Use dateFilter="today" only when user specifically asks for today's tasks
              - deleteTaskTool: Remove tasks
              - searchTaskByTitleTool: Search tasks by title
              - updateTaskTool: Modify existing tasks (like title, priority, due date, time, or completion status)
              
            ` +
                  ` This is the context from the user's query that came from the vector db: ${context}`,
              },
              ...messages,
            ],

            tools: {
              createTaskTool,
              getTasksTool,
              deleteTaskTool,
              searchTaskByTitleTool,
              updateTaskTool,
            },
            toolChoice: "required",
            toolCallStreaming: true,
            maxSteps: 5,
            maxTokens: 800,
            // temperature: 0.1,
            experimental_transform: smoothStream({
              chunking: "word",
              delayInMs: 0,
            }),
            onFinish: async (result) => {
              console.log("Stream steps:", await result.steps);
              console.log("Step finished with tool calls:", result.toolCalls);

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
              }
            },
          });
          return streamResult;
        });

        // console.log("Stream steps:", await result.steps);
        // Merge the result into the data stream
        result.mergeIntoDataStream(dataStream);
      },
      onError: (error: unknown) => {
        console.error("Error generating response:", error);
        const apiError = error as APIError;
        if (apiError?.statusCode === 429) {
          return "I'm currently experiencing high demand. Please try again in a few seconds.";
        }
        return "Sorry, I encountered an error while processing your request.";
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
