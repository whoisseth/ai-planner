import { db } from "@/db";
import { accounts, profiles, users } from "@/db/schema";
import crypto from "crypto";

const ITERATIONS = 10000;
const SALT_LENGTH = 16;

async function hashPassword(plainTextPassword: string, salt: string) {
  return new Promise<string>((resolve, reject) => {
    crypto.pbkdf2(
      plainTextPassword,
      salt,
      ITERATIONS,
      64,
      "sha512",
      (err, derivedKey) => {
        if (err) reject(err);
        resolve(derivedKey.toString("hex"));
      },
    );
  });
}

export async function createTestUser() {
  const email = "test@example.com";
  const password = "Test@123"; // This is the password you'll use to login

  // Generate salt
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  // Hash password
  const hashedPassword = await hashPassword(password, salt);

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email,
      emailVerified: new Date(),
    })
    .returning();

  // Create account with password
  await db.insert(accounts).values({
    userId: user.id,
    accountType: "email",
    password: hashedPassword,
    salt: salt,
  });

  // Create profile
  await db.insert(profiles).values({
    userId: user.id,
    displayName: "Test User",
    bio: "This is a test user account",
  });

  console.log("Test user created successfully!");
  console.log("Email:", email);
  console.log("Password:", password);
  console.log("You can now use these credentials to login");
}

// createTestUser().catch(console.error);
