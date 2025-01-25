import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { desc, asc } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Fetch last 50 messages for the user
    const messages = await db.query.chatMessages.findMany({
      where: (messages, { eq }) => eq(messages.userId, user.id),
      orderBy: (messages, { desc }) => [desc(messages.createdAt)],
      limit: 20,
    });

    // Get the most recent messages and sort them chronologically
    const sortedMessages = messages
      .slice()
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));

    return new Response(
      JSON.stringify({
        messages: sortedMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      }), {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Chat history error:', error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch chat history" }), 
      { status: 500 }
    );
  }
} 