import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { client, db } from ".";
// import { createTestUser } from "../../scripts/create-test-user";

(async () => {
  await migrate(db, { migrationsFolder: "./migrations" });
  client.close();
})();

// createTestUser().catch(console.error);
