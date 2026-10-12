/**
 * Email service - sends OTP emails.
 *
 * Uses SMTP (STARTTLS) when SMTP_HOST and SMTP_USER are configured, otherwise
 * logs the message to the server console (development).
 */

import nodemailer, { type Transporter } from "nodemailer";

import { getEnv } from "./env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_USER) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    if (process.env.NODE_ENV === "production") {
      // Never print OTPs to production logs; surface the misconfiguration instead.
      console.error("SMTP is not configured (SMTP_HOST/SMTP_USER); email not sent.");
      throw new Error("Email service is not configured.");
    }
    console.info(
      [
        "========== EMAIL (console backend) ==========",
        `  To:      ${to}`,
        `  Subject: ${subject}`,
        `  Body:    ${body}`,
        "==============================================",
      ].join("\n")
    );
    return;
  }

  await transport.sendMail({
    from: getEnv().SMTP_FROM,
    to,
    subject,
    text: body,
  });
  console.info(`Email sent to ${to} via SMTP`);
}

/** Send a 6-digit OTP verification email (same wording as the FastAPI backend). */
export function sendOtpEmail(to: string, otp: string): Promise<void> {
  const subject = "Hall 12 - Your Verification Code";
  const body =
    `Your verification code for Hall 12 (Marathas) Portal is:\n\n` +
    `    ${otp}\n\n` +
    `This code expires in 10 minutes. Do not share it with anyone. ` +
    `If this was not done by you immediately contact hall office and Mess secretary and forward this mail to hall12@iitk.ac.in and utkarsh24@iitk.ac.in stating the same.`;
  return sendEmail(to, subject, body);
}
