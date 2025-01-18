// "use client";
import { applicationName } from "@/app-config";
import {
  deleteMagicToken,
  getMagicLinkByToken,
  upsertMagicLink,
} from "@/data-access/magic-links";
import { createProfile } from "@/data-access/profiles";
import {
  createMagicUser,
  getUserByEmail,
  setEmailVerified,
} from "@/data-access/users";
import { MagicLinkEmail } from "@/emails/magic-link";
import { sendEmail } from "@/lib/email";
import { generateRandomName } from "@/lib/names";
import { NotFoundError, TokenExpiredError } from "./errors";
// import { renderToString } from "react-dom/server";
import { render } from "@react-email/render";

export async function sendMagicLinkUseCase(email: string) {
  const token = await upsertMagicLink(email);

  const html = await render(<MagicLinkEmail token={token} />);
  await sendEmail(email, `Your magic login link for ${applicationName}`, html);
}

export async function loginWithMagicLinkUseCase(token: string) {
  const magicLinkInfo = await getMagicLinkByToken(token);
  if (!magicLinkInfo) {
    console.log("Magic link not found");
    throw new NotFoundError();
  }

  if (magicLinkInfo.tokenExpiresAt! < new Date()) {
    console.log("Magic link expired");
    throw new TokenExpiredError();
  }

  const existingUser = await getUserByEmail(magicLinkInfo.email);

  if (existingUser) {
    await setEmailVerified(existingUser.id);
    await deleteMagicToken(token);
    return existingUser;
  } else {
    const newUser = await createMagicUser(magicLinkInfo.email);
    await deleteMagicToken(token);
    await createProfile(newUser.id, generateRandomName());
    return newUser;
  }
}
