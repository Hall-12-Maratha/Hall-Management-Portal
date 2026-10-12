/**
 * Missed bookings job (port of scheduler.mark_missed_bookings).
 *
 * Bookings still `booked` or `cancel_requested` become `missed` once the meal
 * window has passed in India time:
 *   breakfast 09:30, lunch 14:30, dinner 21:30 (same day), or any earlier day.
 */

import { getSql } from "../db/client";
import { istNow } from "../dates";
import type { MealType } from "../db/schema";

export const MEAL_CUTOFF_MINUTES: Record<MealType, number> = {
  breakfast: 9 * 60 + 30,
  lunch: 14 * 60 + 30,
  dinner: 21 * 60 + 30,
};

/** Meals of the current India day whose cutoff has already passed. */
export function mealsPastCutoff(minutesSinceMidnight: number): MealType[] {
  return (Object.keys(MEAL_CUTOFF_MINUTES) as MealType[]).filter(
    (meal) => minutesSinceMidnight >= MEAL_CUTOFF_MINUTES[meal]
  );
}

export async function markMissedBookings(): Promise<number> {
  const { date: today, minutes } = istNow();
  const pastMeals = mealsPastCutoff(minutes);
  const sql = getSql();

  // Note: comparisons are done on typed values (date / text[]) so that
  // Postgres never falls back to text comparison of untyped parameters.
  const result = await sql`
    UPDATE extras_bookings AS b
    SET status = 'missed'
    FROM extras_items AS i
    WHERE i.id = b.item_id
      AND b.status IN ('booked', 'cancel_requested')
      AND (
        i.date < ${today}::date
        OR (i.date = ${today}::date AND i.meal_type::text = ANY(${pastMeals}::text[]))
      )
  `;

  if (result.count > 0) {
    console.info(`[jobs] Marked ${result.count} booking(s) as missed.`);
  }
  return result.count;
}
