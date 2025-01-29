import {
  createUser,
  deleteUser,
  getUserByEmail,
  updateUser,
  verifyPassword,
} from "@/data-access/users";
import { UserId, UserSession } from "@/use-cases/types";
import {
  createAccount,
  createAccountViaGithub,
  createAccountViaGoogle,
  updatePassword,
} from "@/data-access/accounts";
import { createProfile, getProfile } from "@/data-access/profiles";
import { GoogleUser } from "@/app/api/login/google/callback/route";
import { GitHubUser } from "@/app/api/login/github/callback/route";
import {
  createPasswordResetToken,
  deletePasswordResetToken,
  getPasswordResetToken,
} from "@/data-access/reset-tokens";
import { ResetPasswordEmail } from "@/emails/reset-password";
import {
  createVerifyEmailToken,
  deleteVerifyEmailToken,
  getVerifyEmailToken,
} from "@/data-access/verify-email";
import { VerifyEmail } from "@/emails/verify-email";
import { applicationName } from "@/app-config";
import { sendEmail } from "@/lib/email";
import { generateRandomName } from "@/lib/names";
import {
  AuthenticationError,
  EmailInUseError,
  LoginError,
  NotFoundError,
} from "./errors";
import { db } from "@/db";
import { createTransaction } from "@/data-access/utils";
import { render } from "@react-email/render";
import { createSystemLists } from "@/app/actions/lists";

export async function deleteUserUseCase(
  authenticatedUser: UserSession,
  userToDeleteId: UserId,
): Promise<void> {
  if (authenticatedUser.id !== userToDeleteId) {
    throw new AuthenticationError();
  }

  await deleteUser(userToDeleteId);
}

export async function getUserProfileUseCase(userId: UserId) {
  let profile = await getProfile(userId);

  if (!profile) {
    // Create a default profile if none exists
    const defaultDisplayName = await generateRandomName();
    profile = await createProfile(userId, defaultDisplayName);
    
    if (!profile) {
      throw new Error("Failed to create default profile");
    }
  }

  return profile;
}

export async function registerUserUseCase(email: string, password: string) {
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new EmailInUseError();
  }

  const user = await createUser(email);
  await createAccount(user.id, password);
  await createProfile(user.id, generateRandomName());
  await createSystemLists(user.id);

  const token = await createVerifyEmailToken(user.id);

  const verifyEmail = await render(<VerifyEmail token={token} />);
  await sendEmail(
    email,
    `Verify your email for ${applicationName}`,
    verifyEmail,
  );

  return { id: user.id };
}

export async function signInUseCase(email: string, password: string) {
  const user = await getUserByEmail(email);

  if (!user) {
    throw new LoginError();
  }

  const isPasswordCorrect = await verifyPassword(email, password);

  if (!isPasswordCorrect) {
    throw new LoginError();
  }

  return { id: user.id };
}

export async function createGithubUserUseCase(githubUser: GitHubUser) {
  let existingUser = await getUserByEmail(githubUser.email);

  if (!existingUser) {
    existingUser = await createUser(githubUser.email);
    await createSystemLists(existingUser.id);
  }

  await createAccountViaGithub(existingUser.id, githubUser.id);
  await createProfile(existingUser.id, githubUser.login, githubUser.avatar_url);

  return existingUser.id;
}

export async function createGoogleUserUseCase(googleUser: GoogleUser) {
  let existingUser = await getUserByEmail(googleUser.email);

  if (!existingUser) {
    existingUser = await createUser(googleUser.email);
    await createSystemLists(existingUser.id);
  }

  await createAccountViaGoogle(existingUser.id, googleUser.sub);
  await createProfile(existingUser.id, googleUser.name, googleUser.picture);

  return existingUser.id;
}

export async function resetPasswordUseCase(email: string) {
  const user = await getUserByEmail(email);

  if (!user) {
    throw new AuthenticationError();
  }

  const token = await createPasswordResetToken(user.id);

  const resetPassword = await render(<ResetPasswordEmail token={token} />);
  await sendEmail(
    email,
    `Your password reset link for ${applicationName}`,
    resetPassword,
  );
}

export async function changePasswordUseCase(token: string, password: string) {
  const tokenEntry = await getPasswordResetToken(token);

  if (!tokenEntry) {
    throw new AuthenticationError();
  }

  const userId = tokenEntry.userId;

  await createTransaction(async (trx) => {
    await deletePasswordResetToken(token, trx);
    await updatePassword(userId, password, trx);
  });
}

export async function verifyEmailUseCase(token: string) {
  const tokenEntry = await getVerifyEmailToken(token);

  if (!tokenEntry) {
    throw new AuthenticationError();
  }

  const userId = tokenEntry.userId;

  await updateUser(userId, { emailVerified: new Date() });
  await deleteVerifyEmailToken(token);
  return userId;
}
