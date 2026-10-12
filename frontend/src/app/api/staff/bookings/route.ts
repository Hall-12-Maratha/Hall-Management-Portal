/**
 * GET /api/staff/bookings?date&item_id&search - every booking with student and
 * item details, newest first. Port of routers/staff.py::list_all_bookings.
 */

import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings, extrasItems, users } from "@/lib/server/db/schema";
import { handleRoute, json, parseQuery } from "@/lib/server/http";
import { ensureMissedBookingsFresh } from "@/lib/server/jobs";
import { staffBookingsQuerySchema } from "@/lib/server/schemas/extras";
import { toStaffBookingResponse } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "mess_staff");
  const query = parseQuery(req, staffBookingsQuerySchema);
  await ensureMissedBookingsFresh();

  const conditions: SQL[] = [];
  if (query.date) conditions.push(eq(extrasItems.date, query.date));
  if (query.item_id) conditions.push(eq(extrasBookings.itemId, query.item_id));
  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(or(ilike(users.name, term), ilike(users.identifier, term))!);
  }

  const rows = await getDb()
    .select({
      booking: extrasBookings,
      item: extrasItems,
      student: { identifier: users.identifier, name: users.name },
    })
    .from(extrasBookings)
    .innerJoin(users, eq(extrasBookings.studentId, users.id))
    .innerJoin(extrasItems, eq(extrasBookings.itemId, extrasItems.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(extrasBookings.bookedAt));

  return json(
    rows.map(({ booking, item, student }) => toStaffBookingResponse(booking, item, student))
  );
});
