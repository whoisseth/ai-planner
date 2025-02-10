import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log("❌ Authentication failed - no user found");
      return new Response("Unauthorized", { status: 401 });
    }
    console.log("✅ User authenticated:", user.id);

    // Delete all messages for the user
    await db.delete(chatMessages).where(eq(chatMessages.userId, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear chat messages:", error);
    return NextResponse.json(
      { error: "Failed to clear chat messages" },
      { status: 500 },
    );
  }
}
