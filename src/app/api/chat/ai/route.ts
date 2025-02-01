/**
 * Main route handler for AI chat functionality
 * This file serves as the entry point for chat-related API requests
 */
// src/app/api/chat/ai/route.ts

import { getCurrentUser } from "@/lib/session";
import { handleChatRequest } from "./services/chatHandler";

export async function POST(req: Request) {
  // Authenticate user
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Parse request and handle chat
    const { messages } = await req.json();
    return await handleChatRequest(user.id, messages);
  } catch (error) {
    console.error("Error in AI chat route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
