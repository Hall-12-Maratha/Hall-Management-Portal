/**
 * POST /api/staff/bookings/{booking_id}/serve - mark an active booking served.
 * Port of routers/staff.py::serve_booking_staff.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings } from "@/lib/server/db/schema";
import { handleRoute, httpError, message, parseIntParam } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  const me = await requireRole(req, "mess_staff");
  const { id } = await ctx.params;
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
  if (booking.status !== "booked") {
    httpError(400, "Only an active booking can be served.");
  }

  await db
    .update(extrasBookings)
    .set({ status: "served", qrUsedAt: new Date(), servedBy: me.id })
    .where(eq(extrasBookings.id, booking.id));

  return message("Booking marked as served.");
});
