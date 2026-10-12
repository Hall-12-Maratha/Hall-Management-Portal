/**
 * POST /api/auth/forgot-password/reset-password - step 3 of password recovery.
 * Port of routers/auth.py::forgot_password_reset.
 */

import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { decodeToken, passwordFingerprint } from "@/lib/server/auth/jwt";
import { hashPassword } from "@/lib/server/auth/password";
import { issueSession } from "@/lib/server/auth/session";
import { getDb } from "@/lib/server/db/client";
import { users } from "@/lib/server/db/schema";
import { handleRoute, httpError, parseJsonBody } from "@/lib/server/http";
import { forgotPasswordResetSchema } from "@/lib/server/schemas/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, forgotPasswordResetSchema);

  const payload = await decodeToken(body.reset_token);
  if (!payload || payload.type !== "signup" || typeof payload.email !== "string") {
    httpError(400, "Invalid or expired reset token.");
  }

  const db = getDb();
  const email = payload.email.toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.identifier}) = ${email}`)
    .limit(1);
  if (!user) {
    httpError(400, "User not found.");
  }

  // The token is bound to the password hash it was issued against: once the
  // password changes, the token can no longer be replayed.
  if (payload.pwf !== undefined && payload.pwf !== passwordFingerprint(user.passwordHash)) {
    httpError(400, "Invalid or expired reset token.");
  }

  if (!user.isActive) {
    httpError(403, "Account is deactivated. Contact the hall office.");
  }

  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(body.new_password) })
    .where(eq(users.id, user.id))
    .returning();

  return issueSession(updated);
});
