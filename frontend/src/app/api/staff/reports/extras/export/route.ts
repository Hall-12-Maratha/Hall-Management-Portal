/**
 * GET /api/staff/reports/extras/export?start_date&end_date&report_type - CSV
 * report of extras consumption. Port of routers/staff.py::export_extras_csv.
 */

import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { toCsv, type CsvCell } from "@/lib/server/csv";
import { timestampForFilename } from "@/lib/server/dates";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings, extrasItems, users } from "@/lib/server/db/schema";
import { csvResponse, handleRoute, httpError, parseQuery } from "@/lib/server/http";
import { extrasReportQuerySchema } from "@/lib/server/schemas/extras";
import { money } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function rollNumberOf(student: { rollNo: string | null; identifier: string }): string {
  return student.rollNo || student.identifier.split("@")[0];
}

interface StudentAggregate {
  rollNumber: string;
  name: string;
  roomNumber: string;
  bookingCount: number;
  totalQuantity: number;
  totalAmount: number;
  items: Map<string, number>;
}

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "mess_staff");
  const query = parseQuery(req, extrasReportQuerySchema);

  if (query.start_date > query.end_date) {
    httpError(400, "Start date cannot be after end date.");
  }

  const rows = await getDb()
    .select({
      booking: extrasBookings,
      item: extrasItems,
      student: {
        id: users.id,
        identifier: users.identifier,
        name: users.name,
        rollNo: users.rollNo,
        roomNo: users.roomNo,
      },
    })
    .from(extrasBookings)
    .innerJoin(extrasItems, eq(extrasBookings.itemId, extrasItems.id))
    .innerJoin(users, eq(extrasBookings.studentId, users.id))
    .where(
      and(
        gte(extrasItems.date, query.start_date),
        lte(extrasItems.date, query.end_date),
        inArray(extrasBookings.status, ["booked", "served", "missed"])
      )
    )
    .orderBy(asc(extrasItems.date), asc(extrasItems.mealType), asc(users.rollNo), asc(extrasItems.name));

  let table: CsvCell[][];

  if (query.report_type === "student") {
    const grouped = new Map<number, StudentAggregate>();
    for (const { booking, item, student } of rows) {
      let entry = grouped.get(student.id);
      if (!entry) {
        entry = {
          rollNumber: rollNumberOf(student),
          name: student.name,
          roomNumber: student.roomNo ?? "",
          bookingCount: 0,
          totalQuantity: 0,
          totalAmount: 0,
          items: new Map(),
        };
        grouped.set(student.id, entry);
      }
      entry.bookingCount += 1;
      entry.totalQuantity += booking.qty;
      entry.totalAmount += money(booking.totalPrice);
      entry.items.set(item.name, (entry.items.get(item.name) ?? 0) + booking.qty);
    }

    table = [
      ["Roll Number", "Name", "Room Number", "Booking Count", "Total Quantity", "Total Amount (INR)", "Items"],
      ...[...grouped.values()]
        .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber))
        .map((entry) => [
          entry.rollNumber,
          entry.name,
          entry.roomNumber,
          entry.bookingCount,
          entry.totalQuantity,
          entry.totalAmount.toFixed(2),
          [...entry.items.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, qty]) => `${name} x${qty}`)
            .join("; "),
        ]),
    ];
  } else {
    table = [
      ["Date", "Meal", "Roll Number", "Name", "Room Number", "Item", "Quantity", "Status", "Amount (INR)"],
      ...rows.map(({ booking, item, student }) => [
        item.date,
        capitalize(item.mealType),
        rollNumberOf(student),
        student.name,
        student.roomNo ?? "",
        item.name,
        booking.qty,
        booking.status.toUpperCase(),
        money(booking.totalPrice).toFixed(2),
      ]),
    ];
  }

  const filename =
    `extras_report_${query.report_type}_${query.start_date}_to_${query.end_date}` +
    `_${timestampForFilename()}.csv`;
  return csvResponse(toCsv(table), filename);
});
