/**
 * Shared rules for extras items.
 */

import { and, eq, gt, sql } from "drizzle-orm";

import { MS_PER_HOUR, combineDateWithUtcTime } from "./dates";
import type { Db } from "./db/client";
import { extrasBookings, extrasItems, type ExtrasItemRow } from "./db/schema";

/** Booking opens this many hours before it closes. */
export const BOOKING_WINDOW_HOURS = 72;
export const BOOKING_WINDOW_MS = BOOKING_WINDOW_HOURS * MS_PER_HOUR;

/** Minutes between open and close (never negative). */
export function computePrepTime(opensAt: Date, closesAt: Date): number {
  return Math.max(Math.floor((closesAt.getTime() - opensAt.getTime()) / 60_000), 0);
}

/**
 * Upcoming occurrences generated from a weekly rule that nobody has booked yet:
 * same name and meal as the rule, dated after the rule's own date, not
 * themselves rules. Used to propagate edits and deactivation.
 */
function futureUnbookedOccurrences(rule: Pick<ExtrasItemRow, "name" | "mealType" | "date">) {
  return and(
    eq(extrasItems.isRecurring, false),
    eq(extrasItems.name, rule.name),
    eq(extrasItems.mealType, rule.mealType),
    gt(extrasItems.date, rule.date),
    sql`not exists (select 1 from ${extrasBookings} where ${extrasBookings.itemId} = ${extrasItems.id} and ${extrasBookings.status} <> 'cancelled')`
  );
}

/**
 * After a weekly rule is edited, bring its upcoming unbooked occurrences in
 * line (name, price, close time of day, active flag). Occurrences with
 * bookings keep the terms students booked under.
 */
export async function propagateRuleEdit(
  db: Db,
  before: ExtrasItemRow,
  after: ExtrasItemRow
): Promise<number> {
  const targets = await db
    .select({ id: extrasItems.id, date: extrasItems.date })
    .from(extrasItems)
    .where(futureUnbookedOccurrences(before));

  for (const target of targets) {
    const closesAt = combineDateWithUtcTime(target.date, after.closesAt);
    const opensAt = new Date(closesAt.getTime() - BOOKING_WINDOW_MS);
    await db
      .update(extrasItems)
      .set({
        name: after.name,
        price: after.price,
        mealType: after.mealType,
        closesAt,
        opensAt,
        prepTimeMins: computePrepTime(opensAt, closesAt),
        isActive: after.isActive,
      })
      .where(eq(extrasItems.id, target.id));
  }
  return targets.length;
}

/**
 * Hard-delete a weekly rule's upcoming occurrences that nobody has booked
 * (used when the rule moves to another weekday or is deleted permanently).
 */
export async function deleteFutureUnbookedOccurrences(
  db: Db,
  rule: Pick<ExtrasItemRow, "name" | "mealType" | "date">
): Promise<number> {
  const deleted = await db
    .delete(extrasItems)
    .where(futureUnbookedOccurrences(rule))
    .returning({ id: extrasItems.id });
  return deleted.length;
}

/** Number of bookings in any status for an item. */
export async function countBookings(db: Db, itemId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(extrasBookings)
    .where(eq(extrasBookings.itemId, itemId));
  return row?.n ?? 0;
}
