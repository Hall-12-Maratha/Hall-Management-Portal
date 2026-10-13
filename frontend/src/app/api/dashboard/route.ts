/**
 * GET /api/dashboard - everything the student dashboard needs in one call:
 * wastage summary, weekly menu and notices. Replaces three separate requests
 * per page load (the individual endpoints still exist).
 */

import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDashboardSummary, getMenuSlots, getNotices } from "@/lib/server/dashboard";
import { getDb } from "@/lib/server/db/client";
import { handleRoute, json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "student");
  const db = getDb();

  // Sequential on purpose: on Vercel the pool holds one connection per
  // instance, so parallel queries would only queue, and some pooled backends
  // reject interleaved statements on a single session.
  const summary = await getDashboardSummary(db);
  const slots = await getMenuSlots(db);
  const noticeList = await getNotices(db);

  return json({
    summary,
    menu: { slots },
    notices: noticeList,
    generated_at: new Date().toISOString(),
  });
});
