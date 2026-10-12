/**
 * POST /api/staff/bookings/{booking_id}/cancel-request/approve - cancel the booking.
 * POST /api/staff/bookings/{booking_id}/cancel-request/reject  - restore it to booked.
 * Port of routers/staff.py::approve_cancel_request / reject_cancel_request.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings } from "@/lib/server/db/schema";
import { handleRoute, httpError, message, parseIntParam } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; action: string }> };

export const POST = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  await requireRole(req, "mess_staff");
  const { id, action } = await ctx.params;

  if (action !== "approve" && action !== "reject") {
    httpError(404, "Not Found");
  }

  const bookingId = parseIntParam(id, "booking_id");
  const db = getDb();

  const [booking] = await db
    .select()
    .from(extrasBookings)
    .where(eq(extrasBookings.id, bookingId))
    .limit(1);
  if (!booking) {
    httpError(404, "Booking not found.");
  }
  if (booking.status !== "cancel_requested") {
    httpError(400, "This booking has no pending cancellation request.");
  }

  if (action === "approve") {
    await db.update(extrasBookings).set({ status: "cancelled" }).where(eq(extrasBookings.id, booking.id));
    return message("Cancellation request approved.");
  }

  await db.update(extrasBookings).set({ status: "booked" }).where(eq(extrasBookings.id, booking.id));
  return message("Cancellation request rejected.");
});
