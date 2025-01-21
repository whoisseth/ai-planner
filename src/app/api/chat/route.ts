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
    
    const chatService = new ChatService();
    const response = await chatService.getMessage(user.id, messages);

    return new Response(
      JSON.stringify({
        role: "assistant",
        content: response,
        id: crypto.randomUUID(),
      }), {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: error || "Internal Server Error" }), 
      { status: 500 }
    );
  }
}
