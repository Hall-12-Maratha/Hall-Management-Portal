/**
 * Shared rules for extras items.
 */

import { and, eq, gt, lt, sql } from "drizzle-orm";

import { MS_PER_HOUR, combineDateWithUtcTime, weekdayMon0 } from "./dates";
import type { Db } from "./db/client";
import { extrasBookings, extrasItems, type ExtrasItemRow } from "./db/schema";

/** Booking opens this many hours before it closes. */
export const BOOKING_WINDOW_HOURS = 72;
export const BOOKING_WINDOW_MS = BOOKING_WINDOW_HOURS * MS_PER_HOUR;

/** Minutes between open and close (never negative). */
export function computePrepTime(opensAt: Date, closesAt: Date): number {
  return Math.max(Math.floor((closesAt.getTime() - opensAt.getTime()) / 60_000), 0);
}

type SeriesAnchor = Pick<ExtrasItemRow, "name" | "mealType" | "date">;

/**
 * Occurrences of the same weekly series dated after `anchor` (the rule or any
 * one of its occurrences): same name and meal, not themselves rules.
 */
function futureOccurrences(anchor: SeriesAnchor) {
  return and(
    eq(extrasItems.isRecurring, false),
    eq(extrasItems.name, anchor.name),
    eq(extrasItems.mealType, anchor.mealType),
    gt(extrasItems.date, anchor.date)
  );
}

/** Same as futureOccurrences, restricted to rows nobody has a live booking on. */
function futureUnbookedOccurrences(anchor: SeriesAnchor) {
  return and(
    futureOccurrences(anchor),
    sql`not exists (select 1 from ${extrasBookings} where ${extrasBookings.itemId} = ${extrasItems.id} and ${extrasBookings.status} <> 'cancelled')`
  );
}

/**
 * The weekly rule a generated occurrence came from: a recurring row with the
 * same name and meal, on the same weekday, dated before the occurrence.
 * Occurrences carry no parent id, so this is the best available match.
 */
export async function findParentRule(
  db: Db,
  occurrence: Pick<ExtrasItemRow, "name" | "mealType" | "date" | "isRecurring">
): Promise<ExtrasItemRow | null> {
  if (occurrence.isRecurring) return null;
  const weekday = weekdayMon0(occurrence.date);
  const candidates = await db
    .select()
    .from(extrasItems)
    .where(
      and(
        eq(extrasItems.isRecurring, true),
        eq(extrasItems.name, occurrence.name),
        eq(extrasItems.mealType, occurrence.mealType),
        lt(extrasItems.date, occurrence.date)
      )
    );
  const matches = candidates
    .filter((rule) => (rule.recurringWeekday ?? weekdayMon0(rule.date)) === weekday)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return matches[0] ?? null;
}

/**
 * After a weekly rule is edited, bring its upcoming occurrences in line.
 * Name, price, meal and close time only reach occurrences nobody has booked
 * (booked ones keep the terms students booked under). A change of the active
 * flag reaches every upcoming occurrence, so stopping a rule hides booked
 * weeks from the student browse too and restarting it shows them again.
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

  if (before.isActive !== after.isActive) {
    const flagged = await db
      .update(extrasItems)
      .set({ isActive: after.isActive })
      .where(futureOccurrences(before))
      .returning({ id: extrasItems.id });
    return flagged.length;
  }
  return targets.length;
}

/**
 * Hard-delete a weekly series' upcoming occurrences that nobody has booked
 * (used when the rule moves to another weekday or the series is stopped).
 */
export async function deleteFutureUnbookedOccurrences(
  db: Db,
  anchor: SeriesAnchor
): Promise<number> {
  const deleted = await db
    .delete(extrasItems)
    .where(futureUnbookedOccurrences(anchor))
    .returning({ id: extrasItems.id });
  return deleted.length;
}

export type StopSeriesResult = {
  /** The weekly rule that was stopped (null when the item is a one-off). */
  rule: ExtrasItemRow | null;
  /** Upcoming unbooked occurrences removed. */
  removed: number;
  /** Upcoming booked occurrences hidden (kept for booking history). */
  hidden: number;
};

/**
 * Deleting any item of a weekly series ends the series from that item on:
 * the rule stops generating, every later occurrence without bookings is
 * removed and every later occurrence with bookings is hidden. Earlier weeks
 * are left alone. The item itself is the caller's to deactivate or delete.
 *
 * Without this, deactivating or deleting a single generated occurrence leaves
 * the rule active and the recurring-items job recreates the row on its next
 * lazy run (within RECURRING_JOB_INTERVAL_SECONDS).
 *
 * With `permanent`, a rule without bookings is deleted instead of deactivated.
 */
export async function stopSeries(
  db: Db,
  item: ExtrasItemRow,
  opts: { permanent?: boolean } = {}
): Promise<StopSeriesResult> {
  const rule = item.isRecurring ? item : await findParentRule(db, item);

  const removed = await deleteFutureUnbookedOccurrences(db, item);
  const hiddenRows = await db
    .update(extrasItems)
    .set({ isActive: false })
    .where(and(futureOccurrences(item), eq(extrasItems.isActive, true)))
    .returning({ id: extrasItems.id });

  if (rule && rule.id !== item.id) {
    if (opts.permanent && (await countBookings(db, rule.id)) === 0) {
      await db.delete(extrasItems).where(eq(extrasItems.id, rule.id));
    } else if (rule.isActive) {
      await db.update(extrasItems).set({ isActive: false }).where(eq(extrasItems.id, rule.id));
    }
  }

  return { rule, removed, hidden: hiddenRows.length };
}

/** Number of bookings in any status for an item. */
export async function countBookings(db: Db, itemId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(extrasBookings)
    .where(eq(extrasBookings.itemId, itemId));
  return row?.n ?? 0;
}
