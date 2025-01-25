import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { desc, asc, lt, and, eq, sql } from "drizzle-orm";
import { SQL } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = 7;

    const baseConditions = [eq(chatMessages.userId, user.id)];
    if (cursor) {
      baseConditions.push(lt(chatMessages.createdAt, new Date(cursor)));
    }

    const messages = await db.query.chatMessages.findMany({
      where: and(...baseConditions),
      orderBy: [desc(chatMessages.createdAt)],
      limit: limit + 1,
    });

    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;
    
    // For cursor-based pagination, we need the oldest message's timestamp
    const oldestMessage = messagesToReturn[messagesToReturn.length - 1];
    const nextCursor = hasMore ? oldestMessage?.createdAt?.toISOString() : null;

    return new Response(
      JSON.stringify({
        messages: messagesToReturn.map(msg => ({
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt?.toISOString(),
        })),
        hasMore,
        nextCursor,
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