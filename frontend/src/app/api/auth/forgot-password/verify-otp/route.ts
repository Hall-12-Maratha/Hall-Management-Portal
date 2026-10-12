/**
 * POST /api/auth/forgot-password/verify-otp - step 2 of password recovery.
 * Port of routers/auth.py::forgot_password_verify_otp.
 */

import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { createSignupToken } from "@/lib/server/auth/jwt";
import { verifyPassword } from "@/lib/server/auth/password";
import { getDb } from "@/lib/server/db/client";
import { users } from "@/lib/server/db/schema";
import { handleRoute, httpError, json, parseJsonBody } from "@/lib/server/http";
import { forgotPasswordVerifyOtpSchema } from "@/lib/server/schemas/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OTP_ATTEMPTS = 5;

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, forgotPasswordVerifyOtpSchema);
  const email = body.email.trim().toLowerCase();
  const db = getDb();

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.identifier}) = ${email}`)
    .limit(1);
  if (!user || !user.passwordSet) {
    httpError(400, "Invalid request.");
  }

  if (!user.otpExpiresAt || Date.now() > user.otpExpiresAt.getTime()) {
    httpError(400, "OTP has expired. Please request a new one.");
  }

  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    httpError(429, "Too many attempts. Please request a new OTP.");
  }

  if (!user.otpHash || !(await verifyPassword(body.otp, user.otpHash))) {
    await db
      .update(users)
      .set({ otpAttempts: user.otpAttempts + 1 })
      .where(eq(users.id, user.id));
    httpError(400, "Invalid OTP. Please try again.");
  }

  const resetToken = await createSignupToken(email, user.passwordHash);

  await db
    .update(users)
    .set({ otpHash: null, otpExpiresAt: null })
    .where(eq(users.id, user.id));

  return json({ reset_token: resetToken, message: "OTP verified. Set your new password." });
});
