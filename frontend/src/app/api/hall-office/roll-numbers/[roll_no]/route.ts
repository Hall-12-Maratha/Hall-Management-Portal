/**
 * PATCH  /api/hall-office/roll-numbers/{roll_no} - restrict or restore the
 *        student's login (sets users.is_active) without touching the roll row.
 * DELETE /api/hall-office/roll-numbers/{roll_no} - remove a roll and deactivate
 *        its student account. Port of routers/hall_office.py::delete_roll_number.
 */

import { and, eq, or, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { allowedRollNumbers, users } from "@/lib/server/db/schema";
import { handleRoute, httpError, message, parseJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ roll_no: string }> };

const accessSchema = z.object({ is_active: z.boolean() });

export const PATCH = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  await requireRole(req, "hall_office");
  const { roll_no } = await ctx.params;
  const rollNo = decodeURIComponent(roll_no);
  const body = await parseJsonBody(req, accessSchema);
  const db = getDb();

  const [roll] = await db
    .select()
    .from(allowedRollNumbers)
    .where(eq(allowedRollNumbers.rollNo, rollNo))
    .limit(1);
  if (!roll) {
    httpError(404, "Roll number not found.");
  }

  const emailLower = roll.email?.toLowerCase() ?? null;
  const [student] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.role, "student"),
        emailLower
          ? or(eq(users.rollNo, roll.rollNo), sql`lower(${users.identifier}) = ${emailLower}`)
          : eq(users.rollNo, roll.rollNo)
      )
    )
    .limit(1);
  if (!student) {
    httpError(404, "This student has not set up an account yet.");
  }

  await db.update(users).set({ isActive: body.is_active }).where(eq(users.id, student.id));

  return message(body.is_active ? "Student access restored." : "Student access restricted.");
});

export const DELETE = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  await requireRole(req, "hall_office");
  const { roll_no } = await ctx.params;
  const rollNo = decodeURIComponent(roll_no);
  const db = getDb();

  const [roll] = await db
    .select()
    .from(allowedRollNumbers)
    .where(eq(allowedRollNumbers.rollNo, rollNo))
    .limit(1);
  if (!roll) {
    httpError(404, "Roll number not found.");
  }

  await db.transaction(async (tx) => {
    await tx.delete(allowedRollNumbers).where(eq(allowedRollNumbers.rollNo, roll.rollNo));

    if (roll.email) {
      await tx
        .update(users)
        .set({ isActive: false })
        .where(
          and(sql`lower(${users.identifier}) = ${roll.email.toLowerCase()}`, eq(users.role, "student"))
        );
    }
  });

  return message("Roll number deleted successfully.");
});
