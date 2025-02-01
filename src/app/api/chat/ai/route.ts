// src/app/api/chat/ai/route.ts
import { groq } from "@ai-sdk/groq";
import { generateText, tool } from "ai";
import { z } from "zod";
import { createTask } from "@/app/actions/tasks";
import { Message } from "ai";
import { getCurrentUser } from "@/lib/session";
import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClient } from "cohere-ai";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

// Initialize Cohere client
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

// Initialize Pinecone index
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX || "");

// Helper function to get embedding vector
async function getEmbedding(text: string): Promise<number[]> {
  const response = await cohere.embed({
    texts: [text],
    model: "embed-english-v3.0",
    inputType: "search_query",
  });

  if (!response.embeddings || !Array.isArray(response.embeddings)) {
    throw new Error("Invalid embedding response");
  }

  const embedding = response.embeddings[0];
  if (!Array.isArray(embedding)) {
    throw new Error("Invalid embedding format");
  }

  return embedding;
}

// Helper function to save messages and their embeddings
async function saveMessageWithEmbedding(
  userId: number,
  content: string,
  role: "user" | "assistant",
) {
  // Generate embedding for the message
  const embedding = await getEmbedding(content);

  // Save message to chat history
  const [message] = await db
    .insert(chatMessages)
    .values({
      userId,
      content,
      role,
      contextId: crypto.randomUUID(),
    })
    .returning();

  // Save embedding to Pinecone
  await pineconeIndex.upsert([
    {
      id: message.id.toString(),
      values: embedding,
      metadata: {
        userId: userId.toString(),
        content,
        role,
        timestamp: new Date().toISOString(),
      },
    },
  ]);

  return message;
}

// Helper function to get relevant context
async function getRelevantContext(userId: number, query: string) {
  // Generate embedding for the query
  const embedding = await getEmbedding(query);

  // Query Pinecone for similar messages
  const results = await pineconeIndex.query({
    vector: embedding,
    filter: { userId: userId.toString() },
    topK: 5,
    includeMetadata: true,
  });

  // Format context from similar messages
  return results.matches
    .map((match) => match.metadata?.content)
    .filter(Boolean)
    .join("\n");
}

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
