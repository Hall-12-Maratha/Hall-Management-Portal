/**
 * GET  /api/hall-office/roll-numbers - list allowed rolls, newest first.
 * POST /api/hall-office/roll-numbers - add one roll (with a fresh setup code).
 * Port of routers/hall_office.py::get_roll_numbers / add_roll_number.
 */

import { and, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { generateSetupCode } from "@/lib/server/auth/password";
import { getDb } from "@/lib/server/db/client";
import { allowedRollNumbers, users } from "@/lib/server/db/schema";
import { handleRoute, httpError, json, parseJsonBody } from "@/lib/server/http";
import { allowedRollCreateSchema } from "@/lib/server/schemas/hallOffice";
import { toAllowedRoll } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "hall_office");

  const rolls = await getDb()
    .select()
    .from(allowedRollNumbers)
    .orderBy(desc(allowedRollNumbers.uploadedAt));

  return json(rolls.map(toAllowedRoll));
});

export const POST = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "hall_office");
  const body = await parseJsonBody(req, allowedRollCreateSchema);
  const rollNo = body.roll_no.trim().toUpperCase();
  const db = getDb();

  const [existing] = await db
    .select({ rollNo: allowedRollNumbers.rollNo })
    .from(allowedRollNumbers)
    .where(eq(allowedRollNumbers.rollNo, rollNo))
    .limit(1);
  if (existing) {
    httpError(409, "Roll number already exists in allowed list.");
  }

  const [emailClash] = await db
    .select({ rollNo: allowedRollNumbers.rollNo })
    .from(allowedRollNumbers)
    .where(eq(allowedRollNumbers.email, body.email))
    .limit(1);
  if (emailClash) {
    httpError(409, `Email already used by roll number ${emailClash.rollNo}.`);
  }

  const inserted = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(allowedRollNumbers)
      .values({
        rollNo,
        name: body.name,
        // The email is the student's login identifier (userid@iitk.ac.in).
        email: body.email,
        roomNumber: body.room_number,
        setupCode: generateSetupCode(),
        uploadedBy: me.id,
      })
      .returning();

    // Reactivate a previously deactivated student with this roll number.
    await tx
      .update(users)
      .set({ isActive: true })
      .where(and(eq(users.rollNo, rollNo), eq(users.role, "student")));

    return row;
  });

  return json(toAllowedRoll(inserted));
});
