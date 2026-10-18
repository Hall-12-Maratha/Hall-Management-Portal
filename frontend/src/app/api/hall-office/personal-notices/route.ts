/**
 * GET  /api/hall-office/personal-notices?roll_no= - personal notices, newest
 *      first (optionally for one roll number), at most 500.
 * POST /api/hall-office/personal-notices - send one notice to one student by
 *      roll number, 201. Pushes a notification to that student's devices.
 */

import { desc, eq } from "drizzle-orm";
import { after, type NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { personalNotices, users } from "@/lib/server/db/schema";
import { handleRoute, httpError, json, parseJsonBody, parseQuery } from "@/lib/server/http";
import { insertPersonalNotices } from "@/lib/server/personalNotices";
import { PERSONAL_NOTICE_PUSH, pushInBackground, pushToUsers } from "@/lib/server/push";
import { personalNoticeCreateSchema, personalNoticesQuerySchema } from "@/lib/server/schemas/personalNotice";
import { toPersonalNoticeAdmin } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST_LIMIT = 500;

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "hall_office");
  const query = parseQuery(req, personalNoticesQuerySchema);

  const rows = await getDb()
    .select({ notice: personalNotices, student: { rollNo: users.rollNo, name: users.name } })
    .from(personalNotices)
    .innerJoin(users, eq(personalNotices.studentId, users.id))
    .where(query.roll_no ? eq(users.rollNo, query.roll_no) : undefined)
    .orderBy(desc(personalNotices.createdAt), desc(personalNotices.id))
    .limit(LIST_LIMIT);

  return json(rows.map(({ notice, student }) => toPersonalNoticeAdmin(notice, student)));
});

export const POST = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "hall_office");
  const body = await parseJsonBody(req, personalNoticeCreateSchema);
  const db = getDb();

  const result = await insertPersonalNotices(
    db,
    [{ row: 1, rollNo: body.roll_no, title: body.title, notice: body.notice }],
    me.id
  );
  if (result.inserted === 0) {
    httpError(404, "No student account with this roll number.");
  }

  const [created] = await db
    .select({ notice: personalNotices, student: { rollNo: users.rollNo, name: users.name } })
    .from(personalNotices)
    .innerJoin(users, eq(personalNotices.studentId, users.id))
    .where(eq(personalNotices.studentId, result.studentIds[0]))
    .orderBy(desc(personalNotices.id))
    .limit(1);

  after(() => pushInBackground(() => pushToUsers(result.studentIds, PERSONAL_NOTICE_PUSH)));

  return json(toPersonalNoticeAdmin(created.notice, created.student), 201);
});
