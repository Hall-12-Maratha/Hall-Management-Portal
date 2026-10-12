/**
 * DELETE /api/notices/{notice_id} - remove a notice (hall_office or mess_staff).
 * Port of routers/notices.py::delete_notice.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireUser } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { notices } from "@/lib/server/db/schema";
import { handleRoute, httpError, message, parseIntParam } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  const me = await requireUser(req);
  if (me.role !== "hall_office" && me.role !== "mess_staff") {
    httpError(403, "You do not have permission to delete notices.");
  }
  const { id } = await ctx.params;
  const noticeId = parseIntParam(id, "notice_id");

  const deleted = await getDb()
    .delete(notices)
    .where(eq(notices.id, noticeId))
    .returning({ id: notices.id });
  if (deleted.length === 0) {
    httpError(404, "Notice not found.");
  }

  return message("Notice deleted.");
});
