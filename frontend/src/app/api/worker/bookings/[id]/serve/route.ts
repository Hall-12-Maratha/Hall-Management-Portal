/**
 * POST /api/worker/bookings/{booking_id}/serve - mark an active booking served
 * from the manual queue (no QR token needed, independent of QR_SCANNING_ENABLED).
 *
 * New in the Next.js version: the FastAPI queue reused /worker/scan, which is
 * blocked by the QR feature flag, so workers could not serve at all while
 * scanning was disabled.
 */

import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings, extrasItems, users } from "@/lib/server/db/schema";
import { handleRoute, httpError, json, parseIntParam } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  const me = await requireRole(req, "mess_worker");
  const { id } = await ctx.params;
  const bookingId = parseIntParam(id, "booking_id");
  const db = getDb();

  // Atomic conditional update: only an active booking can be served.
  const [served] = await db
    .update(extrasBookings)
    .set({ status: "served", qrUsedAt: new Date(), servedBy: me.id })
    .where(and(eq(extrasBookings.id, bookingId), eq(extrasBookings.status, "booked")))
    .returning();

  if (!served) {
    const [booking] = await db
      .select({ status: extrasBookings.status })
      .from(extrasBookings)
      .where(eq(extrasBookings.id, bookingId))
      .limit(1);
    if (!booking) {
      httpError(404, "Booking not found.");
    }
    if (booking.status === "served") {
      httpError(400, "Booking already served.");
    }
    httpError(409, `Booking is ${booking.status.replace("_", " ")} and cannot be served.`);
  }

  const [item] = await db
    .select({ name: extrasItems.name })
    .from(extrasItems)
    .where(eq(extrasItems.id, served.itemId))
    .limit(1);
  const [student] = await db
    .select({ identifier: users.identifier })
    .from(users)
    .where(eq(users.id, served.studentId))
    .limit(1);

  return json({
    message: "Marked as served.",
    booking_id: served.id,
    item_name: item?.name ?? "Unknown",
    qty: served.qty,
    student_identifier: student?.identifier ?? "Unknown",
  });
});
