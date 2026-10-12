/**
 * POST /api/worker/scan - atomically mark a booking served by its QR token.
 * Port of routers/worker.py::scan_qr (behind QR_SCANNING_ENABLED).
 */

import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings, extrasItems, users } from "@/lib/server/db/schema";
import { getEnv } from "@/lib/server/env";
import { handleRoute, httpError, json, parseJsonBody } from "@/lib/server/http";
import { scanRequestSchema } from "@/lib/server/schemas/extras";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "mess_worker");
  const body = await parseJsonBody(req, scanRequestSchema);

  if (!getEnv().QR_SCANNING_ENABLED) {
    httpError(503, "QR scanning is temporarily disabled. Use the manual queue instead.");
  }

  const db = getDb();

  // Atomic conditional update: only an active booking can be served.
  const [served] = await db
    .update(extrasBookings)
    .set({ status: "served", qrUsedAt: new Date(), servedBy: me.id })
    .where(and(eq(extrasBookings.qrToken, body.qr_token), eq(extrasBookings.status, "booked")))
    .returning();

  if (served) {
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
  }

  const [booking] = await db
    .select()
    .from(extrasBookings)
    .where(eq(extrasBookings.qrToken, body.qr_token))
    .limit(1);

  if (!booking) {
    httpError(404, "QR code not recognized.");
  }

  if (booking.status === "served" && booking.qrUsedAt) {
    return json({
      already_served: true,
      served_at: booking.qrUsedAt.toISOString(),
      message: "This QR code was already used.",
    });
  }

  httpError(409, `Booking is ${booking.status.replace("_", " ")} and cannot be served.`);
});
