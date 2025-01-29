// src/lib/session.ts
import { Session as DbSession } from "@/db/schema";

/**
 * Type for user IDs - must be string to match database schema
 */
export type UserId = string;

/**
 * Interface representing a user session
 */
export type Session = DbSession;

/**
 * Type representing an authenticated user
 */
export type User = {
  id: UserId;
  email: string;
  name: string | null;
  image: string | null;
} | null;
