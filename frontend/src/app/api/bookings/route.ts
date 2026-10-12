/**
 * POST /api/bookings - student places a booking.
 * Port of routers/bookings.py::create_booking.
 */

import { and, eq, ne } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { generateQrToken } from "@/lib/server/auth/password";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings, extrasItems } from "@/lib/server/db/schema";
import { handleRoute, httpError, json, parseJsonBody } from "@/lib/server/http";
import { bookingCreateSchema } from "@/lib/server/schemas/extras";
import { toBookingResponse } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "student");
  const body = await parseJsonBody(req, bookingCreateSchema);
  const db = getDb();

  const [item] = await db
    .select()
    .from(extrasItems)
    .where(and(eq(extrasItems.id, body.item_id), eq(extrasItems.isActive, true)))
    .limit(1);
  if (!item) {
    httpError(404, "Item not found or is no longer available.");
  }

  const now = new Date();
  if (now < item.opensAt) {
    httpError(400, "Booking has not opened yet.");
  }
  if (now >= item.closesAt) {
    httpError(400, "Booking window has closed.");
  }

  const [existing] = await db
    .select({ id: extrasBookings.id })
    .from(extrasBookings)
    .where(
      and(
        eq(extrasBookings.studentId, me.id),
        eq(extrasBookings.itemId, item.id),
        ne(extrasBookings.status, "cancelled")
      )
    )
    .limit(1);
  if (existing) {
    httpError(
      409,
      "You already have a booking for this item. Modify the existing booking instead."
    );
  }

  const totalPrice = (Number(item.price) * body.qty).toFixed(2);

  const [booking] = await db
    .insert(extrasBookings)
    .values({
      studentId: me.id,
      itemId: item.id,
      qty: body.qty,
      totalPrice,
      status: "booked",
      qrToken: generateQrToken(),
    })
    .returning();

  return json(toBookingResponse(booking, item), 201);
});
