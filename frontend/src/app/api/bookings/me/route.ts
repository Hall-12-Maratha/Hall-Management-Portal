/**
 * GET /api/bookings/me?start_date&end_date - own booking history + running total.
 * Port of routers/bookings.py::get_my_bookings.
 */

import { and, desc, eq, gte, lte, notInArray, sql, type SQL } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings, extrasItems } from "@/lib/server/db/schema";
import { handleRoute, json, parseQuery } from "@/lib/server/http";
import { ensureMissedBookingsFresh } from "@/lib/server/jobs";
import { bookingRangeQuerySchema } from "@/lib/server/schemas/extras";
import { money, toBookingResponse } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "student");
  const query = parseQuery(req, bookingRangeQuerySchema);
  await ensureMissedBookingsFresh();
  const db = getDb();

  const conditions: SQL[] = [eq(extrasBookings.studentId, me.id)];
  if (query.start_date) conditions.push(gte(extrasItems.date, query.start_date));
  if (query.end_date) conditions.push(lte(extrasItems.date, query.end_date));

  const rows = await db
    .select({ booking: extrasBookings, item: extrasItems })
    .from(extrasBookings)
    .innerJoin(extrasItems, eq(extrasBookings.itemId, extrasItems.id))
    .where(and(...conditions))
    .orderBy(desc(extrasBookings.bookedAt));

  // Global running total: every booking that is not cancelled / cancel-requested.
  const [{ total }] = await db
    .select({ total: sql<string>`coalesce(sum(${extrasBookings.totalPrice}), 0)` })
    .from(extrasBookings)
    .where(
      and(
        eq(extrasBookings.studentId, me.id),
        notInArray(extrasBookings.status, ["cancelled", "cancel_requested"])
      )
    );

  return json({
    bookings: rows.map(({ booking, item }) => toBookingResponse(booking, item)),
    running_total: money(total),
  });
});
