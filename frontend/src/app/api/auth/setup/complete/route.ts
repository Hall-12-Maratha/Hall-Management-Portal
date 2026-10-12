/**
 * POST /api/auth/setup/complete - step 2 of student account setup.
 * Port of routers/auth.py::setup_complete.
 */

import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { hashPassword } from "@/lib/server/auth/password";
import { issueSession } from "@/lib/server/auth/session";
import { getDb } from "@/lib/server/db/client";
import { allowedRollNumbers, users, type UserRow } from "@/lib/server/db/schema";
import { handleRoute, httpError, parseJsonBody } from "@/lib/server/http";
import {
  SETUP_CODE_LIMIT,
  SETUP_LIMIT_DETAIL,
  assertUnderLimit,
  clearKey,
  recordHit,
} from "@/lib/server/rate-limit";
import { setupCompleteSchema } from "@/lib/server/schemas/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, setupCompleteSchema);
  const rollNo = body.roll_no.trim();
  const db = getDb();

  const limitKey = `setup:${rollNo.toUpperCase()}`;
  await assertUnderLimit(limitKey, SETUP_CODE_LIMIT, SETUP_LIMIT_DETAIL);

  const [existingUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.rollNo, rollNo), eq(users.role, "student")))
    .limit(1);
  if (existingUser?.passwordSet) {
    httpError(409, "An account is already registered. Please log in.");
  }

  const [allowed] = await db
    .select()
    .from(allowedRollNumbers)
    .where(eq(allowedRollNumbers.rollNo, rollNo))
    .limit(1);
  if (!allowed || !allowed.setupCode || allowed.setupCode !== body.setup_code) {
    await recordHit(limitKey);
    httpError(400, "Invalid setup code.");
  }

  if (existingUser && !existingUser.isActive) {
    httpError(403, "Account is deactivated. Contact the hall office.");
  }

  const passwordHash = await hashPassword(body.password);

  const user = await db.transaction(async (tx): Promise<UserRow> => {
    let row: UserRow;

    if (!existingUser) {
      const identifier = (allowed.email ?? `${rollNo}@student.iitk.ac.in`).toLowerCase();
      const [inserted] = await tx
        .insert(users)
        .values({
          identifier,
          email: allowed.email ? allowed.email.toLowerCase() : null,
          passwordHash,
          role: "student",
          name: body.name,
          roomNo: body.room_no,
          rollNo,
          isActive: true,
          otpAttempts: 0,
          passwordSet: true,
          mustChangePassword: false,
          failedLoginAttempts: 0,
        })
        .returning();
      row = inserted;
    } else {
      const [updated] = await tx
        .update(users)
        .set({
          passwordHash,
          passwordSet: true,
          name: body.name,
          roomNo: body.room_no,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      row = updated;
    }

    // Setup codes are single use.
    await tx
      .update(allowedRollNumbers)
      .set({ setupCode: null })
      .where(eq(allowedRollNumbers.rollNo, rollNo));

    return row;
  });

  await clearKey(limitKey);
  return issueSession(user);
});
