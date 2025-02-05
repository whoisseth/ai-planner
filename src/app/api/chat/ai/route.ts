/**
 * Main route handler for AI chat functionality
 * This file serves as the entry point for chat-related API requests
 */
// src/app/api/chat/ai/route.ts

import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { groq } from "@ai-sdk/groq";
import { getCurrentUser } from "@/lib/session";
import { SYSTEM_PROMPTS } from './constants/chatConstants';
import { saveMessageWithEmbedding, getRelevantContext } from './services/embeddings';
import { createTaskTool, deleteTaskTool, getTasksTool, searchTaskByTitleTool, updateTaskTool } from './services/taskTool';

export async function POST(req: Request) {
  // Authenticate user
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // Get relevant context
    const context = await getRelevantContext(user.id, lastMessage.content);
    console.log("Retrieved context from pinecone db:", `----Start ${context} ----End`);

    // Save user message with embedding
    await saveMessageWithEmbedding(user.id, lastMessage.content, "user");

    // Create streaming response
    return createDataStreamResponse({
      execute: async (dataStream) => {
        const result = streamText({
          model: groq('gemma2-9b-it'),
          messages: [
            {
              role: "system",
              content: `
                  You are a task management assistant with access to the following tools:
                  - createTaskTool: Create new tasks
                  - getTasksTool: View and list tasks
                  - deleteTaskTool: Delete existing tasks 
                  - searchTaskByTitleTool: Search for tasks by title
                  - updateTaskTool: Update existing task details

                  ${SYSTEM_PROMPTS.base} & ${SYSTEM_PROMPTS.responseStyle}
                  Previous context from our conversation: ${context}
                  
                  Always maintain a professional but friendly tone, focusing on helping users be more productive and organized with their tasks.`
            },
            ...messages
          ],
          tools: {
            createTaskTool,
            getTasksTool,
            deleteTaskTool,
            searchTaskByTitleTool,
            updateTaskTool,
          },
          toolChoice: "auto",
          maxSteps: 5,
          experimental_transform: smoothStream({ chunking: 'word' }),
          onFinish: async (result) => {
            // Save the complete response
            if (result.text) {
              await saveMessageWithEmbedding(user.id, result.text, "assistant");
            }
          }
        });

        // Merge the result into the data stream
        result.mergeIntoDataStream(dataStream);
      },
      onError: (error) => {
        console.error("Error generating response:", error);
        return "Sorry, I encountered an error while processing your request.";
      }
    });

  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
