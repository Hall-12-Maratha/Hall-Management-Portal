/**
 * POST /api/hall-office/personal-notices/upload - bulk personal notices from
 * a CSV (multipart field `file`, columns: roll, title, notice). Rows that
 * cannot be used (bad roll, empty text, no student account) are skipped and
 * reported; the rest are inserted in one transaction. Each addressed student
 * gets one push notification.
 */

import { after, type NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { handleRoute, httpError, json } from "@/lib/server/http";
import { insertPersonalNotices, parsePersonalNoticesCsv } from "@/lib/server/personalNotices";
import { PERSONAL_NOTICE_PUSH, pushInBackground, pushToUsers } from "@/lib/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 1_048_576;

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
    text = new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch {
    httpError(400, "File is not valid UTF-8 text.");
  }

  const parsed = parsePersonalNoticesCsv(text);
  if (parsed.rows.length === 0 && parsed.skipped.length === 0) {
    httpError(400, "CSV file contains no notices.");
  }

  const result = await getDb().transaction((tx) => insertPersonalNotices(tx, parsed.rows, me.id));
  const skipped = [...parsed.skipped, ...result.skipped].sort((a, b) => a.row - b.row);

  if (result.studentIds.length > 0) {
    after(() => pushInBackground(() => pushToUsers(result.studentIds, PERSONAL_NOTICE_PUSH)));
  }

  return json({
    count: result.inserted,
    skipped,
    message:
      skipped.length === 0
        ? `${result.inserted} notice(s) sent.`
        : `${result.inserted} notice(s) sent, ${skipped.length} row(s) skipped.`,
  });
});
