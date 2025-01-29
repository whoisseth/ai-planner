/**
 * @file auth.ts
 * @description Authentication utilities and middleware
 */

import { GitHub, Google } from "arctic";
import { db } from "@/db";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { Session, sessions, User, users } from "@/db/schema";
import { env } from "@/env";
import { eq } from "drizzle-orm";
import { sha256 } from "@oslojs/crypto/sha2";
import type { UserId } from "@/lib/session";

// Constants
const SESSION_REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 24 * 15; // 15 days
const SESSION_MAX_DURATION_MS = SESSION_REFRESH_INTERVAL_MS * 2;
const SESSION_COOKIE_NAME = "session";

// OAuth providers
export const github = new GitHub(
  env.GITHUB_CLIENT_ID,
  env.GITHUB_CLIENT_SECRET
);

export const googleAuth = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.HOST_NAME}/api/login/google/callback`
);

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

/**
 * Creates a new session for a user
 * @param token - The session token
 * @param userId - The user's ID
 * @returns The created session
 */
export async function createSession(
  token: string,
  userId: UserId,
): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + SESSION_MAX_DURATION_MS),
  };
  await db.insert(sessions).values(session);
  return session;
}

/**
 * Validates a session from a request
 * @param request - The request to validate
 * @returns The user and session if valid, null otherwise
 */
export async function validateSession(request: Request): Promise<{ user: User; session: Session } | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = new Map(
    cookieHeader.split(';')
      .map(cookie => cookie.trim().split('=') as [string, string])
  );

  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return null;

  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId)
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await invalidateSession(session.id);
    }
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId)
  });

  if (!user) {
    await invalidateSession(session.id);
    return null;
  }

  // Refresh session if needed
  if (session.expiresAt.getTime() - Date.now() < SESSION_REFRESH_INTERVAL_MS) {
    session.expiresAt = new Date(Date.now() + SESSION_MAX_DURATION_MS);
    await db.update(sessions)
      .set({ expiresAt: session.expiresAt })
      .where(eq(sessions.id, session.id));
  }

  return { user, session };
}

/**
 * Invalidates a session by ID
 * @param sessionId - The ID of the session to invalidate
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Invalidates all sessions for a user
 * @param userId - The ID of the user whose sessions to invalidate
 */
export async function invalidateUserSessions(userId: UserId): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };
