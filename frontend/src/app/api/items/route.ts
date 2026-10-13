/**
 * GET /api/items - extras currently bookable by students: active, inside the
 * open/close window (which opens 72 hours before close) and not dated in the
 * past (India time). The staff Items page uses exactly the same rule to label
 * an item "Open", so what staff see as open is what students can book.
 * Port of routers/items.py::list_available_items.
 */

import { and, asc, eq, gt, gte, lte } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { istToday } from "@/lib/server/dates";
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

  const items = await getDb()
    .select()
    .from(extrasItems)
    .where(
      and(
        eq(extrasItems.isActive, true),
        lte(extrasItems.opensAt, now),
        gt(extrasItems.closesAt, now),
        gte(extrasItems.date, today)
      )
    )
    .orderBy(asc(extrasItems.date), asc(extrasItems.mealType), asc(extrasItems.closesAt));

  return json(items.map(toItemResponse));
});
