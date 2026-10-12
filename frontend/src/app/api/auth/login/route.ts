/**
 * POST /api/auth/login - all roles.
 * Port of routers/auth.py::login.
 */

import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { createChangePasswordToken } from "@/lib/server/auth/jwt";
import { verifyPassword } from "@/lib/server/auth/password";
import { issueSession } from "@/lib/server/auth/session";
import { getDb } from "@/lib/server/db/client";
import { users } from "@/lib/server/db/schema";
import { handleRoute, httpError, json, parseJsonBody } from "@/lib/server/http";
import {
  LOGIN_LIMIT,
  LOGIN_LIMIT_DETAIL,
  assertUnderLimit,
  clearKey,
  normalizeIdentifier,
  recordHit,
} from "@/lib/server/rate-limit";
import { loginSchema } from "@/lib/server/schemas/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, loginSchema);
  const identifier = body.identifier.trim();
  const limitKey = `login:${normalizeIdentifier(identifier)}`;

  await assertUnderLimit(limitKey, LOGIN_LIMIT, LOGIN_LIMIT_DETAIL);

  const db = getDb();
  // Emails are case-insensitive; staff IDs (MS-001) are matched exactly.
  const condition = identifier.includes("@")
    ? sql`lower(${users.identifier}) = ${identifier.toLowerCase()}`
    : eq(users.identifier, identifier);
  const [user] = await db.select().from(users).where(condition).limit(1);

  if (!user) {
    await recordHit(limitKey);
    httpError(401, "Invalid credentials.");
  }

  if (!user.isActive) {
    httpError(403, "Account is deactivated. Contact the hall office.");
  }

  if (!user.passwordSet) {
    httpError(400, "Account setup is incomplete. Please complete signup first.");
  }

  if (!(await verifyPassword(body.password, user.passwordHash))) {
    await recordHit(limitKey);
    httpError(401, "Invalid credentials.");
  }

  await clearKey(limitKey);

  if (user.mustChangePassword) {
    return json({
      must_change_password: true,
      change_token: await createChangePasswordToken(user.id),
      message: "You must change your password before continuing.",
    });
  }

  return issueSession(user);
});
