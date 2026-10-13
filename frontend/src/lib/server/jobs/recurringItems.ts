/**
 * Weekly extras: occurrence generation.
 *
 * A weekly item is an `extras_items` row with `is_recurring = true` and
 * `recurring_weekday` set; its own `date` is its first service day. Every
 * later week gets a plain occurrence row (`is_recurring = false`) copied from
 * it: same name, price, meal and close time of day, `opens_at = closes_at - 72h`.
 *
 * Rules:
 * - Occurrences are created for every matching date from today up to
 *   OCCURRENCE_HORIZON_DAYS ahead (India time), so staff can see next week's
 *   row early; students only see it once its booking window opens.
 * - An occurrence is never recreated: if a row with the same name, meal and
 *   date exists in any state (even deactivated), that date is left alone, so
 *   "skip this week" sticks.
 * - Runs lazily from GET /api/items and GET /api/staff/items, throttled.
 */

import { and, eq, gte, lte } from "drizzle-orm";

import { addDays, combineDateWithUtcTime, istToday, weekdayMon0 } from "../dates";
import { getDb, type Db } from "../db/client";
import { extrasItems, type NewExtrasItemRow } from "../db/schema";
import { BOOKING_WINDOW_MS, computePrepTime } from "../extras";

export const OCCURRENCE_HORIZON_DAYS = 7;

export async function recreateRecurringItems(db: Db = getDb()): Promise<number> {
  const today = istToday();
  const horizonEnd = addDays(today, OCCURRENCE_HORIZON_DAYS);

  const rules = await db
    .select()
    .from(extrasItems)
    .where(and(eq(extrasItems.isRecurring, true), eq(extrasItems.isActive, true)));
  if (rules.length === 0) return 0;

  // Every row (active or not) in the horizon: existing occurrences are never duplicated.
  const existing = await db
    .select({ name: extrasItems.name, mealType: extrasItems.mealType, date: extrasItems.date })
    .from(extrasItems)
    .where(and(gte(extrasItems.date, today), lte(extrasItems.date, horizonEnd)));
  const present = new Set(existing.map((row) => `${row.name}|${row.mealType}|${row.date}`));

  const clones: NewExtrasItemRow[] = [];

  for (const rule of rules) {
    const weekday = rule.recurringWeekday ?? weekdayMon0(rule.date);

    for (let offset = 0; offset <= OCCURRENCE_HORIZON_DAYS; offset++) {
      const date = addDays(today, offset);
      if (weekdayMon0(date) !== weekday) continue;
      if (date <= rule.date) continue; // the rule row itself is the first occurrence

      const key = `${rule.name}|${rule.mealType}|${date}`;
      if (present.has(key)) continue;

      const closesAt = combineDateWithUtcTime(date, rule.closesAt);
      const opensAt = new Date(closesAt.getTime() - BOOKING_WINDOW_MS);

      clones.push({
        name: rule.name,
        price: rule.price,
        date,
        mealType: rule.mealType,
        opensAt,
        closesAt,
        prepTimeMins: computePrepTime(opensAt, closesAt),
        isRecurring: false,
        recurringWeekday: null,
        isActive: true,
        createdBy: rule.createdBy,
      });
      present.add(key);
    }
  }

  if (clones.length > 0) {
    await db.insert(extrasItems).values(clones);
    console.info(`[jobs] Created ${clones.length} weekly occurrence(s) through ${horizonEnd}.`);
  }

  return clones.length;
}
