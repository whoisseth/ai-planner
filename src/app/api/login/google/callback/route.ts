// src/app/api/login/google/callback/route.ts

import { cookies } from "next/headers";
import { OAuth2RequestError } from "arctic";
import { googleAuth } from "@/lib/auth";
import { db } from "@/db";
import { accounts, users, profiles } from "@/db/schema";
import { afterLoginUrl } from "@/app-config";
import { setSession } from "@/app/api/_lib/session";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { env } from "@/env";
import { ResponseCookies } from "next/dist/server/web/spec-extension/cookies";

// Helper function to clean up OAuth cookies
async function cleanupOAuthCookies() {
  const cookieStore = (await cookies()) as unknown as ResponseCookies;
  cookieStore.set({
    name: "google_oauth_state",
    value: "",
    maxAge: 0,
    path: "/",
  });
  cookieStore.set({
    name: "google_code_verifier",
    value: "",
    maxAge: 0,
    path: "/",
  });
}

// Helper function to create error response
async function createErrorResponse(message: string, status: number): Promise<Response> {
  await cleanupOAuthCookies();
  return new Response(message, { status });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value ?? null;
  const codeVerifier = cookieStore.get("google_code_verifier")?.value ?? null;

  // Validate OAuth state and code verifier
  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    return createErrorResponse("Invalid OAuth state", 400);
  }

  try {
    // Exchange code for tokens
    const tokens = await googleAuth.validateAuthorizationCode(code, codeVerifier);
    
    // Fetch user info from Google
    let googleUser: GoogleUser;
    try {
      const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user info from Google: ${response.statusText}`);
      }

      const userData = await response.json();
      
      // Validate required fields
      if (!userData.sub || !userData.email || !userData.name) {
        throw new Error("Missing required user information from Google");
      }

      googleUser = userData as GoogleUser;
    } catch (error) {
      console.error("Error fetching Google user info:", error);
      return await createErrorResponse("Failed to fetch user information", 500);
    }

    if (!googleUser.email_verified) {
      return await createErrorResponse("Email not verified with Google", 400);
    }

    // Find existing account
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.providerAccountId, googleUser.sub),
        eq(accounts.provider, "google")
      ),
    });

    if (existingAccount) {
      // Update tokens
      await db
        .update(accounts)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          idToken: tokens.idToken,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, existingAccount.id));

      await setSession(existingAccount.userId);
      await cleanupOAuthCookies();
      return Response.redirect(new URL(afterLoginUrl, env.HOST_NAME));
    }

    // Create new user and account
    const userId = nanoid();
    const now = new Date();
    
    try {
      await db.transaction(async (tx) => {
        // Create user first
        await tx.insert(users).values({
          id: userId,
          email: googleUser.email,
          emailVerified: now,
          createdAt: now,
          updatedAt: now,
        });

        // Create profile
        await tx.insert(profiles).values({
          id: nanoid(),
          userId,
          displayName: googleUser.name,
          image: googleUser.picture,
          createdAt: now,
          updatedAt: now,
        });

        // Create account
        await tx.insert(accounts).values({
          id: nanoid(),
          userId,
          providerType: "oauth",
          provider: "google",
          providerAccountId: googleUser.sub,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          idToken: tokens.idToken,
          createdAt: now,
          updatedAt: now,
        });
      });

      await setSession(userId);
      await cleanupOAuthCookies();
      return Response.redirect(new URL(afterLoginUrl, env.HOST_NAME));
    } catch (error) {
      console.error("Failed to create user account:", error);
      // Check if it's a unique constraint violation (user already exists)
      if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
        // Retry getting the existing account
        const retryAccount = await db.query.accounts.findFirst({
          where: and(
            eq(accounts.providerAccountId, googleUser.sub),
            eq(accounts.provider, "google")
          ),
        });

        if (retryAccount) {
          await setSession(retryAccount.userId);
          await cleanupOAuthCookies();
          return Response.redirect(new URL(afterLoginUrl, env.HOST_NAME));
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Google OAuth error:", error);
    if (error instanceof OAuth2RequestError) {
      return await createErrorResponse("Invalid authorization code", 400);
    }
    return await createErrorResponse("Internal server error", 500);
  }
}

export interface GoogleUser {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}
