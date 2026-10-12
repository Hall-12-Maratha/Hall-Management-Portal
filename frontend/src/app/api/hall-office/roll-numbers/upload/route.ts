/**
 * POST /api/hall-office/roll-numbers/upload - replace the allowed roll list
 * from a CSV (multipart field `file`, columns: roll_no, name, email, room).
 * Port of routers/hall_office.py::upload_roll_numbers.
 */

import { and, eq, inArray, notInArray } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/server/auth/guard";
import { parseCsv } from "@/lib/server/csv";
import { getDb } from "@/lib/server/db/client";
import { allowedRollNumbers, users } from "@/lib/server/db/schema";
import { handleRoute, httpError, json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 1_048_576;
const HEADER_ALIASES = new Set(["roll", "roll_no", "roll_number"]);
const ROLL_NO_RE = /^[A-Za-z0-9-]{3,50}$/;

interface ParsedRoll {
  rollNo: string;
  name: string | null;
  email: string;
  roomNumber: string | null;
}

export const POST = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "hall_office");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    httpError(422, "file: Field required.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    httpError(422, "file: Field required.");
  }

  if (!file.name || !file.name.toLowerCase().endsWith(".csv")) {
    httpError(400, "File must be a .csv file.");
  }

  const content = Buffer.from(await file.arrayBuffer());
  if (content.length > MAX_UPLOAD_BYTES) {
    httpError(400, "File too large. Maximum size is 1MB.");
  }

  let text: string;
  try {
    // fatal: reject invalid UTF-8; the BOM (utf-8-sig) is stripped automatically.
    text = new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch {
    httpError(400, "File is not valid UTF-8 text.");
  }

  const parsedRows: ParsedRoll[] = [];
  parseCsv(text).forEach((row, rowIdx) => {
    if (row.length === 0 || row.every((cell) => cell.trim() === "")) return;

    const rollNo = (row[0] ?? "").trim().toUpperCase();
    if (!rollNo) return;

    if (rowIdx === 0 && HEADER_ALIASES.has(rollNo.toLowerCase().replace(/ /g, "_"))) return;

    if (!ROLL_NO_RE.test(rollNo)) {
      httpError(400, `Invalid roll number on CSV row ${rowIdx + 1}.`);
    }

    const name = row[1]?.trim() ? row[1].trim() : null;
    const roomNumber = row[3]?.trim() ? row[3].trim() : null;

    // The email is the student's login identifier and OTP address, so it is required.
    const emailResult = z.email().safeParse((row[2] ?? "").trim().toLowerCase());
    if (!emailResult.success) {
      httpError(400, `Invalid or missing email on CSV row ${rowIdx + 1}.`);
    }

    parsedRows.push({
      rollNo,
      name,
      email: emailResult.data,
      roomNumber,
    });
  });

  if (parsedRows.length === 0) {
    httpError(400, "CSV file contains no valid roll numbers.");
  }

  const seen = new Set<string>();
  const uniqueRolls = parsedRows.filter((row) => {
    if (seen.has(row.rollNo)) return false;
    seen.add(row.rollNo);
    return true;
  });

  // Emails are login identifiers, so two rolls cannot share one.
  const emailOwners = new Map<string, string>();
  for (const row of uniqueRolls) {
    const owner = emailOwners.get(row.email);
    if (owner) {
      httpError(400, `Email ${row.email} is used by both ${owner} and ${row.rollNo}.`);
    }
    emailOwners.set(row.email, row.rollNo);
  }

  await getDb().transaction(async (tx) => {
    // Replace mode: drop the previous list (and its setup codes) entirely.
    await tx.delete(allowedRollNumbers);

    await tx.insert(allowedRollNumbers).values(
      uniqueRolls.map((row) => ({
        rollNo: row.rollNo,
        name: row.name,
        email: row.email,
        roomNumber: row.roomNumber,
        uploadedBy: me.id,
      }))
    );

    const activeEmails = uniqueRolls.map((row) => row.email.toLowerCase());
    if (activeEmails.length > 0) {
      await tx
        .update(users)
        .set({ isActive: false })
        .where(and(eq(users.role, "student"), notInArray(users.identifier, activeEmails)));
      await tx
        .update(users)
        .set({ isActive: true })
        .where(and(eq(users.role, "student"), inArray(users.identifier, activeEmails)));
    }
  });

  return json({
    count: uniqueRolls.length,
    message: `${uniqueRolls.length} roll numbers uploaded (replaced existing list).`,
  });
});
