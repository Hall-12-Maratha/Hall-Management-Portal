/**
 * POST /api/hall-office/staff - create a mess_staff / mess_worker account.
 * GET  /api/hall-office/staff - list staff accounts, newest first.
 * Port of routers/hall_office.py::create_staff_account / list_staff.
 */

import { count, desc, eq, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { generateTempPassword, hashPassword } from "@/lib/server/auth/password";
import { getDb } from "@/lib/server/db/client";
import { users } from "@/lib/server/db/schema";
import { handleRoute, json, parseJsonBody } from "@/lib/server/http";
import { staffCreateSchema } from "@/lib/server/schemas/hallOffice";
import { toStaffListItem } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAFF_ROLES = ["mess_staff", "mess_worker"] as const;

export const POST = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "hall_office");
  const body = await parseJsonBody(req, staffCreateSchema);
  const db = getDb();

  const prefix = body.role === "mess_staff" ? "MS" : "MW";
  const [{ existing }] = await db
    .select({ existing: count() })
    .from(users)
    .where(eq(users.role, body.role));

  let sequence = existing;
  let staffId = `${prefix}-${String(sequence + 1).padStart(3, "0")}`;
  // Ensure uniqueness (accounts may have been renumbered or deleted historically).
  for (;;) {
    const [clash] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.identifier, staffId))
      .limit(1);
    if (!clash) break;
    sequence += 1;
    staffId = `${prefix}-${String(sequence + 1).padStart(3, "0")}`;
  }

  const tempPassword = generateTempPassword();

  const [user] = await db
    .insert(users)
    .values({
      identifier: staffId,
      email: null,
      passwordHash: await hashPassword(tempPassword),
      role: body.role,
      name: body.name,
      isActive: true,
      otpAttempts: 0,
      passwordSet: true,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      createdBy: me.id,
    })
    .returning();

  return json({
    id: user.id,
    identifier: staffId,
    name: user.name,
    role: user.role,
    temp_password: tempPassword,
    message: "Account created. Share this password securely - it will not be shown again.",
  });
});

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "hall_office");

  const staff = await getDb()
    .select()
    .from(users)
    .where(inArray(users.role, [...STAFF_ROLES]))
    .orderBy(desc(users.createdAt));

  return json(staff.map(toStaffListItem));
});
