import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { client, db } from ".";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigrations() {
  try {
    // First try running the migration through drizzle
    try {
      await migrate(db, { migrationsFolder: "./migrations" });
      console.log("Migrations completed successfully through drizzle");
    } catch (error) {
      console.log("Drizzle migration failed, trying manual SQL execution");
      
      // If drizzle migration fails, try executing the SQL directly
      const migrationPath = join(process.cwd(), "migrations", "0000_init.sql");
      const sqlContent = readFileSync(migrationPath, "utf8");
      
      // Split the SQL into individual statements
      const statements = sqlContent
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      // Execute each statement
      for (const statement of statements) {
        try {
          await client.execute(statement);
        } catch (error) {
          if (error instanceof Error) {
            // Ignore "table already exists" errors
            if (!error.message.includes("already exists")) {
              throw error;
            }
          }
        }
      }
      console.log("Manual migration completed successfully");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Migration failed:", error.message);
    } else {
      console.error("Unknown error during migration:", error);
    }
    process.exit(1);
  } finally {
    client.close();
  }
}

runMigrations().catch((error) => {
  console.error("Failed to run migrations:", error);
  process.exit(1);
});
