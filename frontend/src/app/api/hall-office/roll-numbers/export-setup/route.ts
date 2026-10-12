/**
 * GET /api/hall-office/roll-numbers/export-setup - CSV of setup codes.
 * Generates a code for every roll that has not registered yet and clears codes
 * of rolls that have. Port of routers/hall_office.py::export_setup_codes.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { generateSetupCode } from "@/lib/server/auth/password";
import { toCsv, type CsvCell } from "@/lib/server/csv";
import { timestampForFilename } from "@/lib/server/dates";
import { getDb } from "@/lib/server/db/client";
import { allowedRollNumbers, users } from "@/lib/server/db/schema";
import { csvResponse, handleRoute } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "hall_office");
  const db = getDb();

  const rolls = await db.select().from(allowedRollNumbers);
  const students = await db
    .select({ identifier: users.identifier, rollNo: users.rollNo })
    .from(users)
    .where(eq(users.role, "student"));

  const registeredEmails = new Set(students.map((s) => s.identifier.toLowerCase()));
  const registeredRolls = new Set(students.map((s) => s.rollNo).filter((r): r is string => !!r));

  const rows: CsvCell[][] = [["Roll No", "Name", "Email", "Room Number", "Setup Code", "Status"]];
  const updates: { rollNo: string; setupCode: string | null }[] = [];

  for (const roll of rolls) {
    const isRegistered =
      (!!roll.email && registeredEmails.has(roll.email.toLowerCase())) ||
      registeredRolls.has(roll.rollNo);

    let status: string;
    let setupCode: string;

    if (isRegistered) {
      status = "Already Registered";
      setupCode = "-";
      if (roll.setupCode) updates.push({ rollNo: roll.rollNo, setupCode: null });
    } else {
      status = "Pending Setup";
      if (!roll.setupCode) {
        const generated = generateSetupCode();
        updates.push({ rollNo: roll.rollNo, setupCode: generated });
        setupCode = generated;
      } else {
        setupCode = roll.setupCode;
      }
    }

    rows.push([roll.rollNo, roll.name ?? "", roll.email ?? "", roll.roomNumber ?? "", setupCode, status]);
  }

  if (updates.length > 0) {
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(allowedRollNumbers)
          .set({ setupCode: update.setupCode })
          .where(eq(allowedRollNumbers.rollNo, update.rollNo));
      }
    });
  }

  return csvResponse(toCsv(rows), `student_setup_codes_${timestampForFilename()}.csv`);
});
