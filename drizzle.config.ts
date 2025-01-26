import type { Config } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env" });

export default {
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DB_AUTH_TOKEN!,
  },
} satisfies Config;
