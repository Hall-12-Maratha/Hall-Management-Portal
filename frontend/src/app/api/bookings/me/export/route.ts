/**
 * GET /api/bookings/me/export - own booking history as CSV.
 * Port of routers/bookings.py::export_my_bookings.
 */

import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { toCsv } from "@/lib/server/csv";
import { formatUtcMinute, timestampForFilename } from "@/lib/server/dates";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings, extrasItems } from "@/lib/server/db/schema";
import { csvResponse, handleRoute } from "@/lib/server/http";
import { money } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const GET = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "student");

  const rows = await getDb()
    .select({ booking: extrasBookings, item: extrasItems })
    .from(extrasBookings)
    .innerJoin(extrasItems, eq(extrasBookings.itemId, extrasItems.id))
    .where(eq(extrasBookings.studentId, me.id))
    .orderBy(desc(extrasItems.date), desc(extrasBookings.bookedAt));

  const csv = toCsv([
    ["Date", "Meal", "Item", "Quantity", "Price (INR)", "Status", "Booked At"],
    ...rows.map(({ booking, item }) => [
      item.date,
      capitalize(item.mealType),
      item.name,
      booking.qty,
      money(booking.totalPrice).toFixed(2),
      booking.status.toUpperCase(),
      formatUtcMinute(booking.bookedAt),
    ]),
  ]);

  return csvResponse(csv, `my_bookings_history_${timestampForFilename()}.csv`);
});
