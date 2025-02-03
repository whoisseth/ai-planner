// src/app/api/chat/ai/services/chatHandler.ts
import { groq } from "@ai-sdk/groq";
import { generateText, Message, streamText } from "ai";
import { createStreamHandlers } from "./streamService";
import { isTaskManagementIntent } from "../utils/intentDetection";
import { createTaskTool, deleteTaskTool, getTasksTool, searchTaskByTitleTool, updateTaskTool } from "./taskTool";
import { saveMessageWithEmbedding, getRelevantContext } from "./embeddings";
import { SYSTEM_PROMPTS } from "../constants/chatConstants";

/**
 * Generates an AI response using the configured model
 */

// ${shouldIncludeTaskTools
//   ? "You have access to task management capabilities - use them when appropriate."
//   : "Guide users to explicitly request task creation, viewing, updating, or deleting when needed."
// }`,



// Follow these steps for every user message:
// 1. First, analyze if the user's request involves any task operations (create, read, update, delete, search)
// 2. If yes, use the appropriate tool from the available tools above
// 3. If no task operation is requested, provide helpful guidance and suggestions based on the conversation context


async function generateAIResponseWithAi(
  messages: Message[],
  context: string,
  // shouldIncludeTaskTools: boolean
) {
  return generateText({
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
      ...messages,
    ] as Message[],
    tools:
    {
      createTaskTool,
      getTasksTool,
      deleteTaskTool,
      searchTaskByTitleTool,
      updateTaskTool,
    },
    toolChoice: "auto",
    maxSteps: 5,
    // temperature: AI_CONFIG.temperature,
  }
  );
}

/**
 * Processes the chat response in the background
 */
async function processResponse(
  userId: number,
  messages: Message[],
  lastMessageContent: string,
  streamHandlers: ReturnType<typeof createStreamHandlers>
): Promise<void> {
  try {
    // Save user message with embedding
    await saveMessageWithEmbedding(userId, lastMessageContent, "user");

    // Get relevant context
    const context = await getRelevantContext(userId, lastMessageContent);
    console.log("Retrieved context from pinecone db:", `----Start
       ${context}
       ----End
       `);


    // Generate response
    const response = await generateAIResponseWithAi(
      messages,
      context,
      // lastMessageContent
    );
    console.log(`---start_response.toolCalls-> ${response.steps} <-end`)
    // console.log(` ---response.reasoning_start ${response.reasoning} --- end_response.reasoning  `)
    // Save assistant response
    await saveMessageWithEmbedding(userId, response.text, "assistant");
    // return response.text
    // await streamHandlers.sendMessage(response.text, true);
    // await streamHandlers.close();

    for await (const textPart of response.text) {
      console.log(textPart);
    }

  } catch (error) {
    console.error("Error generating response:", error);
    const errorMessage = error instanceof Error
      ? `Sorry, I encountered an error: ${error.message}`
      : "Sorry, I encountered an error while processing your request";
    await streamHandlers.sendMessage(errorMessage, true);
    await streamHandlers.close();
  }
}

/**
 * Handles a chat request and returns a streaming response
 */
export async function handleChatRequest(
  userId: number,
  messages: Message[]
): Promise<Response> {
  const streamHandlers = createStreamHandlers();

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Invalid or empty messages array" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const lastMessage = messages[messages.length - 1];

  try {
    console.log("Last message:", lastMessage.content);

    // Process in background
    processResponse(userId, messages, lastMessage.content, streamHandlers);

    return new Response(streamHandlers.getReadableStream(), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat handler:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
} 
