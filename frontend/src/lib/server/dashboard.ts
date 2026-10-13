/**
 * Read models shared by the student dashboard and the individual endpoints
 * (/api/dashboard/summary, /api/menu/weekly, /api/notices).
 */

import { and, asc, desc, gte, lte, max } from "drizzle-orm";

import { addDays, istToday, toIso } from "./dates";
import { getDb, type Db } from "./db/client";
import { notices, wastageLogs, weeklyMenu } from "./db/schema";
import { toMenuSlot, toNotice } from "./serializers";

export interface DashboardSummary {
  avg_bdmr: number | null;
  plain_wastage: number | null;
  plate_wastage: number | null;
  wastage_date: string | null;
  last_updated: string | null;
}

/** Port of routers/dashboard.py::get_dashboard_summary. */
export async function getDashboardSummary(db: Db = getDb()): Promise<DashboardSummary> {
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
    return { avg_bdmr: null, plain_wastage: null, plate_wastage: null, wastage_date: null, last_updated: null };
  }

  const avgBdmr =
    bdmrLogs.length > 0
      ? Math.round((bdmrLogs.reduce((sum, row) => sum + row.bdmr, 0) / bdmrLogs.length) * 100) / 100
      : null;

  const [{ lastUpdated }] = await db
    .select({ lastUpdated: max(wastageLogs.enteredAt) })
    .from(wastageLogs)
    .where(lte(wastageLogs.date, today));

  return {
    avg_bdmr: avgBdmr,
    plain_wastage: latest.plainWastage,
    plate_wastage: latest.plateWastage,
    wastage_date: latest.date,
    last_updated: toIso(lastUpdated),
  };
}

/** All saved menu slots ordered by day then meal. */
export async function getMenuSlots(db: Db = getDb()) {
  const slots = await db
    .select()
    .from(weeklyMenu)
    .orderBy(asc(weeklyMenu.dayOfWeek), asc(weeklyMenu.mealType));
  return slots.map(toMenuSlot);
}

/** All notices, newest first. */
export async function getNotices(db: Db = getDb()) {
  const rows = await db.select().from(notices).orderBy(desc(notices.createdAt));
  return rows.map(toNotice);
}
