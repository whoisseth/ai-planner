import "server-only";
import { AuthenticationError } from "@/utils";
import {
  createSession,
  generateSessionToken,
  validateRequest,
} from "@/lib/auth";
import { cache } from "react";
import { cookies } from "next/headers";
import { UserId } from "@/use-cases/types";

const SESSION_COOKIE_NAME = "session";

export async function setSessionTokenCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSessionTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export const getCurrentUser = cache(async () => {
  const { user } = await validateRequest();
  return user;
});

export const assertAuthenticated = async () => {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError();
  }
  return user;
};

export async function setSession(userId: UserId) {
  const token = generateSessionToken();
  const session = await createSession(token, userId);
  await setSessionTokenCookie(token, new Date(session.expiresAt));
}

export type User = Awaited<ReturnType<typeof getCurrentUser>>;
