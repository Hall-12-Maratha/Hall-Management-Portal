/**
 * POST /api/bookings/{booking_id}/request-cancel - ask staff to cancel after
 * the window closed. Port of routers/bookings.py::request_cancel_booking.
 */

import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings, extrasItems } from "@/lib/server/db/schema";
import { handleRoute, httpError, message, parseIntParam } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  const me = await requireRole(req, "student");
  const { id } = await ctx.params;
  const bookingId = parseIntParam(id, "booking_id");
  const db = getDb();

  const [row] = await db
    .select({ booking: extrasBookings, item: extrasItems })
    .from(extrasBookings)
    .innerJoin(extrasItems, eq(extrasBookings.itemId, extrasItems.id))
    .where(and(eq(extrasBookings.id, bookingId), eq(extrasBookings.studentId, me.id)))
    .limit(1);
  if (!row) {
    httpError(404, "Booking not found.");
  }

  if (row.booking.status !== "booked") {
    httpError(400, "Cannot request cancellation for this booking.");
  }
  if (new Date() < row.item.closesAt) {
    httpError(400, "Booking is still open. Cancel it directly instead.");
  }

  await db
    .update(extrasBookings)
    .set({ status: "cancel_requested" })
    .where(eq(extrasBookings.id, row.booking.id));

  return message("Cancellation requested.");
});
