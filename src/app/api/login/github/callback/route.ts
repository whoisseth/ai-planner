import { cookies } from "next/headers";
import { OAuth2RequestError } from "arctic";
import { github } from "@/lib/auth";
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
  const storedState = (await cookies()).get("github_oauth_state")?.value ?? null;

  if (!code || !state || !storedState || state !== storedState) {
    return new Response("Invalid OAuth state", { status: 400 });
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);
    const githubUserResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!githubUserResponse.ok) {
      throw new Error("Failed to fetch user info from GitHub");
    }

    const githubUser: GitHubUser = await githubUserResponse.json();

    // Get email if not provided
    if (!githubUser.email) {
      const githubUserEmailResponse = await fetch(
        "https://api.github.com/user/emails",
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        },
      );

      if (!githubUserEmailResponse.ok) {
        throw new Error("Failed to fetch GitHub user emails");
      }

      const githubUserEmails = await githubUserEmailResponse.json();
      const primaryEmail = githubUserEmails.find((email: Email) => email.primary && email.verified);
      
      if (!primaryEmail) {
        return new Response("No verified primary email found", { status: 400 });
      }

      githubUser.email = primaryEmail.email;
    }

    // Find existing account
    const existingAccount = await db.query.accounts.findFirst({
      where: eq(accounts.providerAccountId, githubUser.id),
    });

    if (existingAccount) {
      // Update tokens
      await db.update(accounts)
        .set({
          accessToken: tokens.accessToken,
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
        email: githubUser.email,
        emailVerified: new Date(), // GitHub emails are verified
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create account
      await tx.insert(accounts).values({
        id: nanoid(),
        userId,
        providerType: "oauth",
        provider: "github",
        providerAccountId: githubUser.id,
        accessToken: tokens.accessToken,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await setSession(userId);
    return Response.redirect(new URL(afterLoginUrl, env.HOST_NAME));
  } catch (e) {
    console.error("GitHub OAuth error:", e);
    if (e instanceof OAuth2RequestError) {
      return new Response("Invalid authorization code", { status: 400 });
    }
    return new Response("Internal server error", { status: 500 });
  }
}

export interface GitHubUser {
  id: string;
  login: string;
  avatar_url: string;
  email: string;
}

interface Email {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}
