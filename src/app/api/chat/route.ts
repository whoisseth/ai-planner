// srapp/api/chat/route.ts
import { getCurrentUser } from "@/lib/session";
import { ChatService } from "@/services/chat";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];
    
    const chatService = new ChatService(user.id);
    const stream = await chatService.streamMessage(user.id, lastMessage.content);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }), 
      { status: 500 }
    );
  }
}
