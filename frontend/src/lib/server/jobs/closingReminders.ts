/**
 * Closing-soon reminders.
 *
 * Any active extras item whose booking window closes within the next
 * REMINDER_LEAD_MINUTES (and is still open) gets one push notification to
 * every subscribed student. The item's `reminder_sent_at` is claimed in the
 * same UPDATE that selects it, so concurrent runs cannot send twice.
 *
 * Runs lazily from the hot read endpoints (see jobs/index.ts). Without a
 * scheduler the reminder goes out on the first request after it becomes due,
 * which during the day is within a few minutes.
 */

import { and, eq, gt, isNull, lte } from "drizzle-orm";

import { getDb } from "../db/client";
import { extrasItems } from "../db/schema";
import { isPushConfigured, pushToAllStudents } from "../push";

export const REMINDER_LEAD_MINUTES = 60;

const IST_OFFSET_MINUTES = 330;

/** "7:30 pm" in India time. */
export function formatIstClock(value: Date): string {
  const ist = new Date(value.getTime() + IST_OFFSET_MINUTES * 60_000);
  const h24 = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  const suffix = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** One line listing the items, e.g. "Paneer Tikka (dinner) closes at 7:30 pm". */
export function reminderBody(items: { name: string; mealType: string; closesAt: Date }[]): string {
  const parts = items.map((i) => `${i.name} (${i.mealType}) closes at ${formatIstClock(i.closesAt)}`);
  return parts.join(" · ");
}

export async function sendClosingReminders(now: Date = new Date()): Promise<number> {
  if (!isPushConfigured()) return 0;

  const horizon = new Date(now.getTime() + REMINDER_LEAD_MINUTES * 60_000);

  // Claim and read in one statement.
  const due = await getDb()
    .update(extrasItems)
    .set({ reminderSentAt: now })
    .where(
      and(
        eq(extrasItems.isActive, true),
        isNull(extrasItems.reminderSentAt),
        lte(extrasItems.opensAt, now),
        gt(extrasItems.closesAt, now),
        lte(extrasItems.closesAt, horizon)
      )
    )
    .returning({ name: extrasItems.name, mealType: extrasItems.mealType, closesAt: extrasItems.closesAt });

  if (due.length === 0) return 0;

  await pushToAllStudents({
    title: due.length === 1 ? "Extras booking closes soon" : `${due.length} extras close soon`,
    body: reminderBody(due),
    url: "/student/browse",
    tag: "closing-soon",
  });
  console.info(`[jobs] Sent closing reminder for ${due.length} item(s).`);
  return due.length;
}
