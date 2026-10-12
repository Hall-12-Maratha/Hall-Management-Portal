/**
 * POST /api/auth/forgot-password/request-otp - step 1 of password recovery.
 * Port of routers/auth.py::forgot_password_request_otp.
 */

import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { generateOtp, hashPassword } from "@/lib/server/auth/password";
import { getDb } from "@/lib/server/db/client";
import { users } from "@/lib/server/db/schema";
import { sendOtpEmail } from "@/lib/server/email";
import { handleRoute, json, parseJsonBody } from "@/lib/server/http";
import { OTP_LIMIT, OTP_LIMIT_DETAIL, consumeOrReject } from "@/lib/server/rate-limit";
import { forgotPasswordRequestOtpSchema } from "@/lib/server/schemas/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_MESSAGE = "If the email is registered, an OTP has been sent.";
const OTP_TTL_MS = 10 * 60 * 1000;

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, forgotPasswordRequestOtpSchema);
  const email = body.email.trim().toLowerCase();

  await consumeOrReject(`otp:${email}`, OTP_LIMIT, OTP_LIMIT_DETAIL);

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.identifier}) = ${email}`)
    .limit(1);

  // Do not reveal whether the account exists.
  if (!user || !user.passwordSet) {
    return json({ message: GENERIC_MESSAGE });
  }

  const otp = generateOtp();
  await db
    .update(users)
    .set({
      otpHash: await hashPassword(otp),
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
      otpAttempts: 0,
    })
    .where(eq(users.id, user.id));

  await sendOtpEmail(email, otp);

  return json({ message: GENERIC_MESSAGE });
});
