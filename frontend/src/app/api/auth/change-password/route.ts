/**
 * POST /api/auth/change-password - forced password change for new staff
 * accounts (uses the change_token returned by login).
 * Port of routers/auth.py::change_password.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { decodeToken, subjectToUserId } from "@/lib/server/auth/jwt";
import { hashPassword } from "@/lib/server/auth/password";
import { issueSession } from "@/lib/server/auth/session";
import { getDb } from "@/lib/server/db/client";
import { users } from "@/lib/server/db/schema";
import { handleRoute, httpError, parseJsonBody } from "@/lib/server/http";
import { forcedChangePasswordSchema } from "@/lib/server/schemas/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, forcedChangePasswordSchema);

  const payload = await decodeToken(body.change_token);
  if (!payload || payload.type !== "change_password") {
    httpError(400, "Invalid or expired change-password token.");
  }
  const userId = subjectToUserId(payload);
  if (userId === null) {
    httpError(400, "Invalid or expired change-password token.");
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    httpError(404, "User not found.");
  }
  if (!user.isActive) {
    httpError(403, "Account is deactivated. Contact the hall office.");
  }

  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(body.new_password), mustChangePassword: false })
    .where(eq(users.id, user.id))
    .returning();

  return issueSession(updated);
});
