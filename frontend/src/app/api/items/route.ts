/**
 * GET /api/items - extras currently bookable by students (today and tomorrow in
 * India time, within the open/close window).
 * Port of routers/items.py::list_available_items.
 */

import { and, asc, eq, gt, gte, lte } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { addDays, istToday } from "@/lib/server/dates";
import { getDb } from "@/lib/server/db/client";
import { extrasItems } from "@/lib/server/db/schema";
import { handleRoute, json } from "@/lib/server/http";
import { ensureRecurringItemsFresh } from "@/lib/server/jobs";
import { toItemResponse } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "student");
  await ensureRecurringItemsFresh();

  const now = new Date();
  const today = istToday(now);
  const tomorrow = addDays(today, 1);

  const items = await getDb()
    .select()
    .from(extrasItems)
    .where(
      and(
        eq(extrasItems.isActive, true),
        lte(extrasItems.opensAt, now),
        gt(extrasItems.closesAt, now),
        gte(extrasItems.date, today),
        lte(extrasItems.date, tomorrow)
      )
    )
    .orderBy(asc(extrasItems.opensAt));

  return json(items.map(toItemResponse));
});
