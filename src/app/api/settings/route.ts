import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { groqApiKey, useCustomGroqKey, deleteKey } = body;

    // Get or create profile
    let profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id),
    });

    if (profile) {
      // Update existing profile
      await db
        .update(profiles)
        .set({ 
          // Only update groqApiKey if it's provided or if delete is requested
          ...(groqApiKey !== undefined || deleteKey ? {
            groqApiKey: deleteKey ? null : groqApiKey,
          } : {}),
          useCustomGroqKey: !!useCustomGroqKey
        })
        .where(eq(profiles.userId, user.id));
    } else {
      // Create new profile
      await db.insert(profiles).values({
        userId: user.id,
        groqApiKey: deleteKey ? null : groqApiKey,
        useCustomGroqKey: !!useCustomGroqKey,
        bio: "",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id),
    });

    return NextResponse.json({
      groqApiKey: profile?.groqApiKey || null,
      useCustomGroqKey: !!profile?.useCustomGroqKey,
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
} 