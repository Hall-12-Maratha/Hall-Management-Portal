/**
 * GET /api/dashboard/summary - student wastage summary.
 * Port of routers/dashboard.py::get_dashboard_summary.
 */

import { and, desc, gte, lte, max } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { addDays, istToday, toIso } from "@/lib/server/dates";
import { getDb } from "@/lib/server/db/client";
import { wastageLogs } from "@/lib/server/db/schema";
import { handleRoute, json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "student");
  const db = getDb();

  const today = istToday();
  const periodStart = addDays(today, -6);

  // BDMR average covers the current India calendar day and the six days before it.
  const bdmrLogs = await db
    .select({ bdmr: wastageLogs.bdmr })
    .from(wastageLogs)
    .where(and(gte(wastageLogs.date, periodStart), lte(wastageLogs.date, today)));

  const [latest] = await db
    .select()
    .from(wastageLogs)
    .where(lte(wastageLogs.date, today))
    .orderBy(desc(wastageLogs.date))
    .limit(1);

  if (!latest) {
    return json({
      avg_bdmr: null,
      plain_wastage: null,
      plate_wastage: null,
      wastage_date: null,
      last_updated: null,
    });
  }

  const avgBdmr =
    bdmrLogs.length > 0
      ? Math.round((bdmrLogs.reduce((sum, row) => sum + row.bdmr, 0) / bdmrLogs.length) * 100) / 100
      : null;

  const [{ lastUpdated }] = await db
    .select({ lastUpdated: max(wastageLogs.enteredAt) })
    .from(wastageLogs)
    .where(lte(wastageLogs.date, today));

  return json({
    avg_bdmr: avgBdmr,
    plain_wastage: latest.plainWastage,
    plate_wastage: latest.plateWastage,
    wastage_date: latest.date,
    last_updated: toIso(lastUpdated),
  });
});
