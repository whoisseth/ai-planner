"use server";

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { env } from "@/env";

const ses = new SESClient({
  region: env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function sendEmail(
  email: string,
  subject: string,
  body: string, // Expect pre-rendered HTML string
) {
  try {
    await ses.send(
      new SendEmailCommand({
        Source: env.EMAIL_FROM,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: subject },
          Body: { Html: { Data: body } },
        },
      }),
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
}
