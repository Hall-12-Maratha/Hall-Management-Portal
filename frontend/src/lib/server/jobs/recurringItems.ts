/**
 * Recurring extras items job (port of scheduler.recreate_recurring_items).
 *
 * For every active recurring template dated before today (India time) whose
 * weekday matches today, create a one-off clone for today unless an active item
 * with the same name and meal already exists for today.
 */

import { and, eq, lt } from "drizzle-orm";

import { combineDateWithUtcTime, istNow, weekdayMon0 } from "../dates";
import { getDb, type Db } from "../db/client";
import { extrasItems, type NewExtrasItemRow } from "../db/schema";

export async function recreateRecurringItems(db: Db = getDb()): Promise<number> {
  const { date: today, weekday: todayWeekday } = istNow();

  const templates = await db
    .select()
    .from(extrasItems)
    .where(
      and(
        eq(extrasItems.isRecurring, true),
        lt(extrasItems.date, today),
        eq(extrasItems.isActive, true)
      )
    );

  const existingToday = await db
    .select({ id: extrasItems.id, name: extrasItems.name, mealType: extrasItems.mealType })
    .from(extrasItems)
    .where(and(eq(extrasItems.isActive, true), eq(extrasItems.date, today)));

  const present = new Set(existingToday.map((row) => `${row.name}|${row.mealType}`));
  const clones: NewExtrasItemRow[] = [];

  for (const template of templates) {
    const targetWeekday = template.recurringWeekday ?? weekdayMon0(template.date);
    if (targetWeekday !== todayWeekday) continue;

    const key = `${template.name}|${template.mealType}`;
    if (present.has(key)) continue;

    const windowMs = template.closesAt.getTime() - template.opensAt.getTime();
    const closesAt = combineDateWithUtcTime(today, template.closesAt);
    const opensAt = new Date(closesAt.getTime() - windowMs);

    clones.push({
      name: template.name,
      price: template.price,
      date: today,
      mealType: template.mealType,
      opensAt,
      closesAt,
      prepTimeMins: template.prepTimeMins,
      isRecurring: false,
      recurringWeekday: null,
      isActive: true,
      createdBy: template.createdBy,
    });
    present.add(key);
  }

  if (clones.length > 0) {
    await db.insert(extrasItems).values(clones);
    console.info(`[jobs] Created ${clones.length} recurring item clone(s) for ${today}.`);
  }

  return clones.length;
}
