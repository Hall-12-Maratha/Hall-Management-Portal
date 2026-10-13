/**
 * PUT    /api/staff/items/{item_id} - partial update. For a weekly rule the
 *        change (name, price, meal, close time, active flag) also applies to its
 *        upcoming occurrences that have no bookings yet; moving the rule to
 *        another weekday drops those occurrences and regenerates them.
 * DELETE /api/staff/items/{item_id}            - stop / deactivate (soft).
 * DELETE /api/staff/items/{item_id}?permanent=true - remove the row for good;
 *        refused while the item has bookings.
 * Port of routers/staff.py::update_item / delete_item.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { weekdayMon0 } from "@/lib/server/dates";
import { getDb } from "@/lib/server/db/client";
import { extrasItems } from "@/lib/server/db/schema";
import {
  BOOKING_WINDOW_MS,
  computePrepTime,
  countBookings,
  deleteFutureUnbookedOccurrences,
  propagateRuleEdit,
} from "@/lib/server/extras";
import { handleRoute, httpError, json, message, parseIntParam, parseJsonBody } from "@/lib/server/http";
import { recreateRecurringItems } from "@/lib/server/jobs";
import { itemUpdateSchema } from "@/lib/server/schemas/extras";
import { toItemResponse } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function loadItem(itemId: number) {
  const [item] = await getDb().select().from(extrasItems).where(eq(extrasItems.id, itemId)).limit(1);
  if (!item) {
    httpError(404, "Item not found.");
  }
  return item;
}

export const PUT = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  await requireRole(req, "mess_staff");
  const { id } = await ctx.params;
  const itemId = parseIntParam(id, "item_id");
  const body = await parseJsonBody(req, itemUpdateSchema);
  const db = getDb();

  const item = await loadItem(itemId);

  // Apply the same "only non-null fields" semantics as the Pydantic model.
  const next = { ...item };
  if (body.name != null) next.name = body.name;
  if (body.price != null) next.price = body.price.toFixed(2);
  if (body.date != null) next.date = body.date;
  if (body.meal_type != null) next.mealType = body.meal_type;
  if (body.closes_at != null) {
    next.closesAt = body.closes_at;
    next.opensAt = new Date(body.closes_at.getTime() - BOOKING_WINDOW_MS);
  }
  if (body.is_recurring != null) {
    next.isRecurring = body.is_recurring;
    if (!body.is_recurring) next.recurringWeekday = null;
  }
  if (body.recurring_weekday != null) {
    next.recurringWeekday = body.recurring_weekday;
  } else if (next.isRecurring && body.date != null) {
    next.recurringWeekday = weekdayMon0(body.date);
  }
  if (body.is_active != null) next.isActive = body.is_active;
  next.prepTimeMins = computePrepTime(next.opensAt, next.closesAt);

  const [updated] = await db
    .update(extrasItems)
    .set({
      name: next.name,
      price: next.price,
      date: next.date,
      mealType: next.mealType,
      opensAt: next.opensAt,
      closesAt: next.closesAt,
      prepTimeMins: next.prepTimeMins,
      isRecurring: next.isRecurring,
      recurringWeekday: next.recurringWeekday,
      isActive: next.isActive,
    })
    .where(eq(extrasItems.id, item.id))
    .returning();

  if (item.isRecurring) {
    const movedDay =
      updated.isRecurring && updated.recurringWeekday !== item.recurringWeekday;
    if (movedDay || !updated.isRecurring) {
      // Old-weekday occurrences nobody booked are no longer wanted.
      await deleteFutureUnbookedOccurrences(db, item);
    } else {
      await propagateRuleEdit(db, item, updated);
    }
  }
  if (updated.isRecurring && updated.isActive) {
    await recreateRecurringItems(db);
  }

  return json(toItemResponse(updated));
});

export const DELETE = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  await requireRole(req, "mess_staff");
  const { id } = await ctx.params;
  const itemId = parseIntParam(id, "item_id");
  const permanent = ["1", "true"].includes(req.nextUrl.searchParams.get("permanent") ?? "");
  const db = getDb();

  const item = await loadItem(itemId);

  if (permanent) {
    const bookings = await countBookings(db, item.id);
    if (bookings > 0) {
      httpError(
        409,
        `This item has ${bookings} booking${bookings === 1 ? "" : "s"} and cannot be deleted. Stop it instead, or clear its bookings first.`
      );
    }
    if (item.isRecurring) {
      await deleteFutureUnbookedOccurrences(db, item);
    }
    await db.delete(extrasItems).where(eq(extrasItems.id, item.id));
    return message("Item deleted permanently.");
  }

  // Soft delete: keep booking history intact.
  const [updated] = await db
    .update(extrasItems)
    .set({ isActive: false })
    .where(eq(extrasItems.id, item.id))
    .returning();

  // A stopped weekly rule takes its unbooked upcoming occurrences with it.
  if (item.isRecurring) {
    await propagateRuleEdit(db, item, updated);
  }

  return message("Item deactivated.");
});
