import { groq } from "@ai-sdk/groq";
import { generateText, Message } from "ai";
import { createStreamHandlers } from "./streamService";
import { isTaskManagementIntent } from "../utils/intentDetection";
import { createTaskTool, getTasksTool } from "./taskTool";
import { saveMessageWithEmbedding, getRelevantContext } from "./embeddings";
import { AI_CONFIG, SYSTEM_PROMPTS } from "../constants/chatConstants";

/**
 * Generates an AI response using the configured model
 */
async function generateAIResponse(
  messages: Message[],
  context: string,
  shouldIncludeTaskTools: boolean
) {
  return generateText({
    model: groq(AI_CONFIG.model),
    messages: [
      {
        role: "system",
        content: `${SYSTEM_PROMPTS.base} & ${SYSTEM_PROMPTS.responseStyle}
        Previous context from our conversation: ${context}
        ${
          shouldIncludeTaskTools
            ? "You have access to task management capabilities - use them when appropriate."
            : "Guide users to explicitly request task creation or viewing when needed."
        }`,
      },
      ...messages,
    ] as Message[],
    tools: shouldIncludeTaskTools
      ? {
          createTaskTool,
          getTasksTool,
        }
      : undefined,
    toolChoice: shouldIncludeTaskTools ? "auto" : "none",
    maxSteps: AI_CONFIG.maxSteps,
    temperature: AI_CONFIG.temperature,
  });
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
    console.log("Retrieved context:", context);

    // Check task management intent
    const shouldIncludeTaskTools = isTaskManagementIntent(lastMessageContent);

    // Generate response
    const response = await generateAIResponse(
      messages,
      context,
      shouldIncludeTaskTools
    );

    // Check if a task was created and get the task title
    let taskTitle = "";
    const hasTaskCreation = response.toolCalls?.some((call: any) => {
      if (call.toolName === 'createTaskTool' || call.type === 'tool-call') {
        try {
          const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
          taskTitle = args.title || "";
          return true;
        } catch (e) {
          return true;
        }
      }
      return false;
    });

    // Save assistant response
    await saveMessageWithEmbedding(userId, response.text, "assistant");

    if (hasTaskCreation) {
      // For task creation, only send a simple success message with the task name
      await streamHandlers.sendMessage(JSON.stringify({
        type: 'task_created',
        isComplete: true,
        content: `✅ Task "${taskTitle}" has been created successfully!`
      }), true);
    } else {
      // For non-task responses, send the text directly
      await streamHandlers.sendMessage(response.text, true);
    }
    
    await streamHandlers.close();
  } catch (error) {
    console.error("Error generating response:", error);
    const errorMessage =
      error instanceof Error
        ? `Failed to generate response: ${error.message}`
        : "Failed to generate response";
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
    console.log("Processing chat request. Last message:", lastMessage.content);

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
