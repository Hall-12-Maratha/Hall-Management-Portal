/**
 * GET /api/dashboard?menu_version= - everything the student dashboard needs
 * in one call: wastage summary, notices, the student's personal notices and
 * the weekly menu.
 *
 * Notices are always fresh. The menu changes rarely, so the client keeps it
 * in the browser together with `menu_version` and sends that version back;
 * when it still matches, `menu` is null and only the version is returned.
 */

import { z } from "zod";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import {
  getDashboardSummary,
  getMenuSlots,
  getMenuVersion,
  getNotices,
  getPersonalNotices,
} from "@/lib/server/dashboard";
import { getDb } from "@/lib/server/db/client";
import { handleRoute, json, parseQuery } from "@/lib/server/http";
import { ensureClosingRemindersFresh } from "@/lib/server/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  menu_version: z.string().max(64).optional(),
});

export const GET = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "student");
  const query = parseQuery(req, querySchema);
  await ensureClosingRemindersFresh();
  const db = getDb();

  // Sequential on purpose: on Vercel the pool holds one connection per
  // instance, so parallel queries would only queue, and some pooled backends
  // reject interleaved statements on a single session.
  const summary = await getDashboardSummary(db);
  const noticeList = await getNotices(db);
  const personal = await getPersonalNotices(me.id, db);
  const menuVersion = await getMenuVersion(db);
  const menu = query.menu_version === menuVersion ? null : { slots: await getMenuSlots(db) };

  return json({
    summary,
    notices: noticeList,
    personal_notices: personal,
    menu_version: menuVersion,
    menu,
    generated_at: new Date().toISOString(),
  });
});
