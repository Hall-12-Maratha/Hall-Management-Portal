/**
 * POST /api/staff/items - create an extras item (201). Booking opens 72 hours
 *      before closes_at. With is_recurring the item is a weekly rule: it
 *      repeats every week on its weekday (occurrences are generated
 *      automatically, see lib/server/jobs/recurringItems.ts).
 * GET  /api/staff/items - every item with its live bookings count, newest
 *      service date first. Generates upcoming weekly occurrences first.
 * Port of routers/staff.py::create_item / list_all_items.
 */

import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { weekdayMon0 } from "@/lib/server/dates";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings, extrasItems } from "@/lib/server/db/schema";
import { BOOKING_WINDOW_MS, computePrepTime } from "@/lib/server/extras";
import { handleRoute, httpError, json, parseJsonBody } from "@/lib/server/http";
import { ensureRecurringItemsFresh, recreateRecurringItems } from "@/lib/server/jobs";
import { itemCreateSchema } from "@/lib/server/schemas/extras";
import { toItemResponse } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "mess_staff");
  const body = await parseJsonBody(req, itemCreateSchema);

  const closesAt = body.closes_at;
  if (closesAt.getTime() <= Date.now()) {
    httpError(400, "closes_at must be in the future.");
  }
  const opensAt = new Date(closesAt.getTime() - BOOKING_WINDOW_MS);
  const db = getDb();

  const [item] = await db
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

  // A new weekly rule gets its upcoming occurrences right away.
  if (item.isRecurring) {
    await recreateRecurringItems(db);
  }

  return json(toItemResponse(item, 0), 201);
});

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "mess_staff");
  await ensureRecurringItemsFresh();

  // Every item with its number of live bookings (cancelled ones excluded).
  const rows = await getDb()
    .select({
      item: extrasItems,
      bookingsCount: sql<number>`count(${extrasBookings.id})::int`,
    })
    .from(extrasItems)
    .leftJoin(
      extrasBookings,
      and(eq(extrasBookings.itemId, extrasItems.id), ne(extrasBookings.status, "cancelled"))
    )
    .groupBy(extrasItems.id)
    .orderBy(desc(extrasItems.date), desc(extrasItems.createdAt));

  return json(rows.map(({ item, bookingsCount }) => toItemResponse(item, bookingsCount)));
});
