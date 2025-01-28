import { cookies } from "next/headers";
import { OAuth2RequestError } from "arctic";
import { googleAuth } from "@/lib/auth";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { afterLoginUrl } from "@/app-config";
import { setSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { env } from "@/env";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = (await cookies()).get("google_oauth_state")?.value ?? null;
  const codeVerifier = (await cookies()).get("google_code_verifier")?.value ?? null;

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    return new Response("Invalid OAuth state", { status: 400 });
  }

  try {
    const tokens = await googleAuth.validateAuthorizationCode(code, codeVerifier);
    
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info from Google");
    }

    const googleUser: GoogleUser = await response.json();

    if (!googleUser.email_verified) {
      return new Response("Email not verified with Google", { status: 400 });
    }

    // Find existing account
    const existingAccount = await db.query.accounts.findFirst({
      where: eq(accounts.providerAccountId, googleUser.sub),
    });

    if (existingAccount) {
      // Update tokens
      await db.update(accounts)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          idToken: tokens.idToken,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, existingAccount.id));

      await setSession(existingAccount.userId);
      return Response.redirect(new URL(afterLoginUrl, env.HOST_NAME));
    }

    // Create new user and account
    const userId = nanoid();
    
    await db.transaction(async (tx) => {
      // Create user
      await tx.insert(users).values({
        id: userId,
        email: googleUser.email,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await setSession(userId);
    return Response.redirect(new URL(afterLoginUrl, env.HOST_NAME));
  } catch (e) {
    console.error("Google OAuth error:", e);
    if (e instanceof OAuth2RequestError) {
      return new Response("Invalid authorization code", { status: 400 });
    }
    return new Response("Internal server error", { status: 500 });
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
