/**
 * POST /api/staff/items - create an extras item (201).
 * GET  /api/staff/items - every item, newest first.
 * Port of routers/staff.py::create_item / list_all_items.
 */

import { desc } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { MS_PER_HOUR, weekdayMon0 } from "@/lib/server/dates";
import { getDb } from "@/lib/server/db/client";
import { extrasItems } from "@/lib/server/db/schema";
import { handleRoute, json, parseJsonBody } from "@/lib/server/http";
import { ensureRecurringItemsFresh } from "@/lib/server/jobs";
import { itemCreateSchema } from "@/lib/server/schemas/extras";
import { toItemResponse } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Booking opens 48 hours before it closes. */
export const BOOKING_WINDOW_MS = 48 * MS_PER_HOUR;

/** Minutes between open and close (never negative). */
export function computePrepTime(opensAt: Date, closesAt: Date): number {
  return Math.max(Math.floor((closesAt.getTime() - opensAt.getTime()) / 60_000), 0);
}

export const POST = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "mess_staff");
  const body = await parseJsonBody(req, itemCreateSchema);

  const closesAt = body.closes_at;
  const opensAt = new Date(closesAt.getTime() - BOOKING_WINDOW_MS);

  const [item] = await getDb()
    .insert(extrasItems)
    .values({
      name: body.name,
      price: body.price.toFixed(2),
      date: body.date,
      mealType: body.meal_type,
      opensAt,
      closesAt,
      prepTimeMins: computePrepTime(opensAt, closesAt),
      isRecurring: body.is_recurring,
      recurringWeekday: body.is_recurring
        ? (body.recurring_weekday ?? weekdayMon0(body.date))
        : null,
      isActive: true,
      createdBy: me.id,
    })
    .returning();

  return json(toItemResponse(item), 201);
});

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "mess_staff");
  await ensureRecurringItemsFresh();

  const items = await getDb().select().from(extrasItems).orderBy(desc(extrasItems.createdAt));
  return json(items.map(toItemResponse));
});
