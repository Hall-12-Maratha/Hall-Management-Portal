/**
 * PUT    /api/bookings/{booking_id}?qty= - change quantity while the window is open.
 * DELETE /api/bookings/{booking_id}      - cancel while the window is open.
 * Port of routers/bookings.py::modify_booking / cancel_booking.
 */

import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings, extrasItems } from "@/lib/server/db/schema";
import {
  handleRoute,
  httpError,
  json,
  message,
  parseIntParam,
  parseQuery,
} from "@/lib/server/http";
import { bookingQtyQuerySchema } from "@/lib/server/schemas/extras";
import { money } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function loadOwnBooking(bookingId: number, studentId: number) {
  const [row] = await getDb()
    .select({ booking: extrasBookings, item: extrasItems })
    .from(extrasBookings)
    .innerJoin(extrasItems, eq(extrasBookings.itemId, extrasItems.id))
    .where(and(eq(extrasBookings.id, bookingId), eq(extrasBookings.studentId, studentId)))
    .limit(1);
  if (!row) {
    httpError(404, "Booking not found.");
  }
  return row;
}

export const PUT = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  const me = await requireRole(req, "student");
  const { id } = await ctx.params;
  const bookingId = parseIntParam(id, "booking_id");
  const { qty } = parseQuery(req, bookingQtyQuerySchema);

  const { booking, item } = await loadOwnBooking(bookingId, me.id);

  if (booking.status !== "booked") {
    httpError(400, "Only active bookings can be modified.");
  }
  if (new Date() >= item.closesAt) {
    httpError(400, "Booking window has closed.");
  }

  const totalPrice = (Number(item.price) * qty).toFixed(2);
  const [updated] = await getDb()
    .update(extrasBookings)
    .set({ qty, totalPrice })
    .where(eq(extrasBookings.id, booking.id))
    .returning();

  return json({
    message: "Booking modified successfully.",
    new_qty: qty,
    new_total: money(updated.totalPrice),
  });
});

export const DELETE = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  const me = await requireRole(req, "student");
  const { id } = await ctx.params;
  const bookingId = parseIntParam(id, "booking_id");

  const { booking, item } = await loadOwnBooking(bookingId, me.id);

  if (booking.status !== "booked") {
    httpError(400, "Only active bookings can be cancelled.");
  }
  if (new Date() >= item.closesAt) {
    httpError(400, "Booking window has closed. Use request cancellation instead.");
  }

  await getDb()
    .update(extrasBookings)
    .set({ status: "cancelled" })
    .where(eq(extrasBookings.id, booking.id));

  return message("Booking cancelled.");
});
