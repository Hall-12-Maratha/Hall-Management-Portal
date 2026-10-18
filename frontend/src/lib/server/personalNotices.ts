/**
 * Personal notices: CSV parsing and the shared insert used by the single and
 * bulk hall-office endpoints.
 *
 * CSV columns, in order: roll, title, notice. A header row is detected when
 * the first cell is "roll", "roll_no" or "roll_number" (case-insensitive).
 */

import { and, eq, inArray } from "drizzle-orm";

import { parseCsv } from "./csv";
import { type Db } from "./db/client";
import { personalNotices, users } from "./db/schema";
import { ROLL_NO_RE } from "./schemas/hallOffice";
import { PERSONAL_NOTICE_TEXT_MAX, PERSONAL_NOTICE_TITLE_MAX } from "./schemas/personalNotice";

export interface ParsedPersonalNotice {
  /** 1-based CSV line, for error reports. */
  row: number;
  rollNo: string;
  title: string;
  notice: string;
}

export interface SkippedRow {
  row: number;
  roll_no: string;
  reason: string;
}

const HEADER_ALIASES = new Set(["roll", "roll_no", "roll_number", "rollno"]);

/** Parse the CSV text. Rows that cannot be used are returned in `skipped`, never thrown. */
export function parsePersonalNoticesCsv(text: string): {
  rows: ParsedPersonalNotice[];
  skipped: SkippedRow[];
} {
  const rows: ParsedPersonalNotice[] = [];
  const skipped: SkippedRow[] = [];

  parseCsv(text).forEach((cells, idx) => {
    const row = idx + 1;
    if (cells.length === 0 || cells.every((c) => c.trim() === "")) return;

    const rollNo = (cells[0] ?? "").trim().toUpperCase();
    if (idx === 0 && HEADER_ALIASES.has(rollNo.toLowerCase().replace(/ /g, "_"))) return;

    const title = (cells[1] ?? "").trim();
    const notice = (cells[2] ?? "").trim();

    if (!rollNo || !ROLL_NO_RE.test(rollNo) || rollNo.length < 3 || rollNo.length > 50) {
      skipped.push({ row, roll_no: rollNo, reason: "Invalid roll number." });
      return;
    }
    if (!title || title.length > PERSONAL_NOTICE_TITLE_MAX) {
      skipped.push({ row, roll_no: rollNo, reason: "Title is empty or too long." });
      return;
    }
    if (!notice || notice.length > PERSONAL_NOTICE_TEXT_MAX) {
      skipped.push({ row, roll_no: rollNo, reason: "Notice is empty or too long." });
      return;
    }
    rows.push({ row, rollNo, title, notice });
  });

  return { rows, skipped };
}

/**
 * Insert notices for the given rows, matching each roll number to its student
 * account. Rows whose roll has no student account are reported in `skipped`.
 * Returns the ids of the students that received a notice (for push).
 */
export async function insertPersonalNotices(
  db: Db,
  rows: ParsedPersonalNotice[],
  createdBy: number
): Promise<{ inserted: number; studentIds: number[]; skipped: SkippedRow[] }> {
  if (rows.length === 0) return { inserted: 0, studentIds: [], skipped: [] };

  const rollNos = Array.from(new Set(rows.map((r) => r.rollNo)));
  const students = await db
    .select({ id: users.id, rollNo: users.rollNo })
    .from(users)
    .where(and(eq(users.role, "student"), inArray(users.rollNo, rollNos)));

  const idByRoll = new Map<string, number>();
  for (const s of students) {
    if (s.rollNo) idByRoll.set(s.rollNo.toUpperCase(), s.id);
  }

  const skipped: SkippedRow[] = [];
  const values: { studentId: number; title: string; notice: string; createdBy: number }[] = [];
  const studentIds = new Set<number>();

  for (const r of rows) {
    const studentId = idByRoll.get(r.rollNo);
    if (!studentId) {
      skipped.push({ row: r.row, roll_no: r.rollNo, reason: "No student account with this roll number." });
      continue;
    }
    values.push({ studentId, title: r.title, notice: r.notice, createdBy });
    studentIds.add(studentId);
  }

  if (values.length > 0) {
    await db.insert(personalNotices).values(values);
  }

  return { inserted: values.length, studentIds: Array.from(studentIds), skipped };
}
