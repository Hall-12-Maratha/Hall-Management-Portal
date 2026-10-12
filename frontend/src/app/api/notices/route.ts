/**
 * GET  /api/notices - every notice, newest first (any authenticated user).
 * POST /api/notices - create a notice (hall_office or mess_staff), 201.
 * Port of routers/notices.py::get_all_notices / create_notice.
 */

import { desc } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireUser } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { notices } from "@/lib/server/db/schema";
import { handleRoute, httpError, json, parseJsonBody } from "@/lib/server/http";
import { noticeCreateSchema } from "@/lib/server/schemas/notice";
import { toNotice } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireUser(req);

  const rows = await getDb().select().from(notices).orderBy(desc(notices.createdAt));
  return json(rows.map(toNotice));
});

export const POST = handleRoute(async (req: NextRequest) => {
  const me = await requireUser(req);
  if (me.role !== "hall_office" && me.role !== "mess_staff") {
    httpError(403, "You do not have permission to post notices.");
  }
  const body = await parseJsonBody(req, noticeCreateSchema);

  const [notice] = await getDb()
    .insert(notices)
    .values({
      title: body.title,
      description: body.description,
      link: body.link,
      createdBy: me.id,
    })
    .returning();

  return json(toNotice(notice), 201);
});
