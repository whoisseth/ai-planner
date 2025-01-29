// src/db/index.ts
import * as schema from "./schema";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { env } from "@/env";

// Database connection management
let _client: ReturnType<typeof createClient> | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

const getDb = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Database client cannot be used on the client side');
  }
  
  if (!_db) {
    if (!_client) {
      _client = createClient({
        url: env.DATABASE_URL!,
        authToken: env.DB_AUTH_TOKEN!,
      });
    }
    _db = drizzle(_client, { schema });
  }
  return _db;
};

// Cleanup function for graceful shutdown
export async function closeDatabase() {
  if (_client) {
    try {
      await _client.close();
      _client = undefined;
      _db = undefined;
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    }
  }
}

// Export types for TypeScript support
export type Database = ReturnType<typeof drizzle<typeof schema>>;

// Export the database instance getter with all necessary operations
export const db = new Proxy({} as Database, {
  get: (_, prop) => {
    const db = getDb();
    if (prop === 'query') {
      return new Proxy({} as Database['query'], {
        get: (_, queryProp) => {
          return db.query[queryProp as keyof typeof db.query];
        }
      });
    }
    return db[prop as keyof Database];
  }
});
