/**
 * POST /api/auth/setup/verify - step 1 of student account setup.
 * Port of routers/auth.py::setup_verify.
 */

import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/lib/server/db/client";
import { allowedRollNumbers, users } from "@/lib/server/db/schema";
import { handleRoute, httpError, json, parseJsonBody } from "@/lib/server/http";
import {
  SETUP_CODE_LIMIT,
  SETUP_LIMIT_DETAIL,
  assertUnderLimit,
  recordHit,
} from "@/lib/server/rate-limit";
import { setupVerifySchema } from "@/lib/server/schemas/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, setupVerifySchema);
  const rollNo = body.roll_no.trim();
  const db = getDb();

  const limitKey = `setup:${rollNo.toUpperCase()}`;
  await assertUnderLimit(limitKey, SETUP_CODE_LIMIT, SETUP_LIMIT_DETAIL);

  const [existingUser] = await db
    .select({ passwordSet: users.passwordSet })
    .from(users)
    .where(and(eq(users.rollNo, rollNo), eq(users.role, "student")))
    .limit(1);
  if (existingUser?.passwordSet) {
    httpError(409, "An account with this roll number is already registered. Please log in.");
  }

  const [allowed] = await db
    .select()
    .from(allowedRollNumbers)
    .where(eq(allowedRollNumbers.rollNo, rollNo))
    .limit(1);
  if (!allowed) {
    await recordHit(limitKey);
    httpError(404, "Roll number not found. Contact the hall office.");
  }

  if (!allowed.setupCode || allowed.setupCode !== body.setup_code) {
    await recordHit(limitKey);
    httpError(400, "Invalid setup code. Please check the code sent to your email.");
  }

  return json({
    name: allowed.name,
    email: allowed.email,
    room_no: allowed.roomNumber,
    message: "Setup code verified. Set your password.",
  });
});
