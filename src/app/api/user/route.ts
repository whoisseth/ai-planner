import { getCurrentUser } from "@/app/api/_lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse(null, { status: 401 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error getting user:", error);
    return new NextResponse(null, { status: 500 });
  }
} 