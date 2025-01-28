// src/lib/session.ts
import "server-only";
import { AuthenticationError } from "@/utils";
import {
  createSession,
  generateSessionToken,
  validateSession,
} from "@/lib/auth";
import { cache } from "react";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { Session as DbSession } from "@/db/schema";

/**
 * Name of the session cookie used for authentication
 */
const SESSION_COOKIE_NAME = "session";

/**
 * Type for user IDs - must be string to match database schema
 */
export type UserId = string;

/**
 * Interface representing a user session
 */
export type Session = DbSession;

/**
 * Validates the current request's authentication
 * @returns The validated session and user
 */
async function validateRequest() {
  const headersList = await headers();
  const request = new Request("http://localhost", {
    headers: headersList,
  });
  const result = await validateSession(request);
  if (!result) return { user: null, session: null };
  return result;
}

/**
 * Sets the session token in an HTTP-only cookie
 * @param token - The session token to set
 * @param expiresAt - The expiration date
 * @throws Error if cookie cannot be set
 */
export async function setSessionTokenCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    });
  } catch (error) {
    console.error("Failed to set session cookie:", error);
    throw new Error("Failed to set session cookie");
  }
}

/**
 * Deletes the session token cookie
 * @throws Error if cookie cannot be deleted
 */
export async function deleteSessionTokenCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });
  } catch (error) {
    console.error("Failed to delete session cookie:", error);
    throw new Error("Failed to delete session cookie");
  }
}

/**
 * Retrieves the current session token from cookies
 * @returns The session token if present, undefined otherwise
 */
export async function getSessionToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch (error) {
    console.error("Failed to get session token:", error);
    return undefined;
  }
}

/**
 * Gets the current authenticated user, with caching
 * @returns The authenticated user or null if not authenticated
 */
export const getCurrentUser = cache(async () => {
  try {
    const result = await validateRequest();
    return result?.user ?? null;
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
});

/**
 * Asserts that the current request is authenticated
 * @throws AuthenticationError if user is not authenticated
 * @returns The authenticated user
 */
export const assertAuthenticated = async () => {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError();
  }
  return user;
};

/**
 * Creates a new session for the given user
 * @param userId - The ID of the user to create a session for
 * @throws Error if session creation fails
 */
export async function setSession(userId: UserId): Promise<void> {
  try {
    const token = generateSessionToken();
    const session = await createSession(token, userId.toString());
    await setSessionTokenCookie(token, session.expiresAt);
  } catch (error) {
    console.error("Failed to set session:", error);
    throw new Error("Failed to create user session");
  }
}

/**
 * Type representing an authenticated user
 */
export type User = Awaited<ReturnType<typeof getCurrentUser>>;
