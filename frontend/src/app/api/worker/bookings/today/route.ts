/**
 * GET /api/worker/bookings/today - active bookings for today's meals (India date).
 * Port of routers/worker.py::todays_bookings.
 */

import { and, asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { istToday } from "@/lib/server/dates";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings, extrasItems, users } from "@/lib/server/db/schema";
import { handleRoute, json } from "@/lib/server/http";
import { ensureMissedBookingsFresh } from "@/lib/server/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "mess_worker");
  await ensureMissedBookingsFresh();

  const rows = await getDb()
    .select({
      id: extrasBookings.id,
      qty: extrasBookings.qty,
      qrToken: extrasBookings.qrToken,
      bookedAt: extrasBookings.bookedAt,
      itemName: extrasItems.name,
      studentIdentifier: users.identifier,
    })
    .from(extrasBookings)
    .innerJoin(extrasItems, eq(extrasBookings.itemId, extrasItems.id))
    .leftJoin(users, eq(extrasBookings.studentId, users.id))
    .where(and(eq(extrasItems.date, istToday()), eq(extrasBookings.status, "booked")))
    .orderBy(asc(extrasBookings.bookedAt));

  return json(
    rows.map((row) => ({
      id: row.id,
      item_name: row.itemName,
      qty: row.qty,
      student_identifier: row.studentIdentifier ?? "Unknown",
      qr_token: row.qrToken,
      booked_at: row.bookedAt.toISOString(),
    }))
  );
});
