import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Fetch first 50 messages for the user
    const messages = await db.query.chatMessages.findMany({
      where: (messages, { eq }) => eq(messages.userId, user.id),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      limit: 100,
    });

    return new Response(
      JSON.stringify({
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Chat history error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch chat history" }),
      { status: 500 },
    );
  }
}
