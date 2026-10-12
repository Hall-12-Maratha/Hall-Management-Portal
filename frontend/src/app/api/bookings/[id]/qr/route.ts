/**
 * GET /api/bookings/{booking_id}/qr - PNG QR code for an active booking.
 * Port of routers/bookings.py::get_booking_qr (behind QR_SCANNING_ENABLED).
 */

import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings } from "@/lib/server/db/schema";
import { getEnv } from "@/lib/server/env";
import { handleRoute, httpError, parseIntParam } from "@/lib/server/http";
import { generateQrPng } from "@/lib/server/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  const me = await requireRole(req, "student");
  const { id } = await ctx.params;
  const bookingId = parseIntParam(id, "booking_id");

  if (!getEnv().QR_SCANNING_ENABLED) {
    httpError(503, "QR codes are temporarily disabled.");
  }

  const [booking] = await getDb()
    .select()
    .from(extrasBookings)
    .where(and(eq(extrasBookings.id, bookingId), eq(extrasBookings.studentId, me.id)))
    .limit(1);
  if (!booking) {
    httpError(404, "Booking not found.");
  }
  if (booking.status !== "booked") {
    httpError(409, "QR is available only for an active booking.");
  }

  const png = await generateQrPng(booking.qrToken);
  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "no-store",
    },
  });
});
