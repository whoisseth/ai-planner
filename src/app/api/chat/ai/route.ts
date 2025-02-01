// src/app/api/chat/ai/route.ts
import { groq } from "@ai-sdk/groq";
import { generateText, tool } from "ai";
import { Message } from "ai";
import { getCurrentUser } from "@/lib/session";
import { createTaskTool } from "./services/taskTool";
import {
  saveMessageWithEmbedding,
  getRelevantContext,
} from "./services/embeddings";

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
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        createdAt: new Date(),
        isComplete,
        isStreaming: !isComplete,
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    // Process the response in the background
    (async () => {
      try {
        // Save user message with embedding
        await saveMessageWithEmbedding(user.id, lastMessage.content, "user");

        // Get relevant context from previous messages
        const context = await getRelevantContext(user.id, lastMessage.content);

        // Generate response using Groq with context
        const response = await generateText({
          model: groq("llama-3.3-70b-versatile"),
          messages: [
            {
              role: "system",
              content: `You are an AI assistant for task management and productivity.
                Previous context: ${context}
                Keep responses concise, logical, simple, and to the point.`,
            },
            ...messages,
          ] as Message[],
          tools: {
            createTask: tool(createTaskTool),
          },
          maxSteps: 5,
          temperature: 0.7,
        });

        // Save assistant response with embedding
        await saveMessageWithEmbedding(user.id, response.text, "assistant");

        // Stream the response
        await sendStream(response.text, true);
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
