/**
 * PUT    /api/staff/items/{item_id} - partial update.
 * DELETE /api/staff/items/{item_id} - soft delete (deactivate).
 * Port of routers/staff.py::update_item / delete_item.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { MS_PER_HOUR, weekdayMon0 } from "@/lib/server/dates";
import { getDb } from "@/lib/server/db/client";
import { extrasItems } from "@/lib/server/db/schema";
import { handleRoute, httpError, json, message, parseIntParam, parseJsonBody } from "@/lib/server/http";
import { itemUpdateSchema } from "@/lib/server/schemas/extras";
import { toItemResponse } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOOKING_WINDOW_MS = 48 * MS_PER_HOUR;

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

  next.prepTimeMins = Math.max(
    Math.floor((next.closesAt.getTime() - next.opensAt.getTime()) / 60_000),
    0
  );

  const [updated] = await getDb()
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

  return json(toItemResponse(updated));
});

export const DELETE = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  await requireRole(req, "mess_staff");
  const { id } = await ctx.params;
  const itemId = parseIntParam(id, "item_id");

  const item = await loadItem(itemId);

  // Soft delete: keep booking history intact.
  await getDb().update(extrasItems).set({ isActive: false }).where(eq(extrasItems.id, item.id));

  return message("Item deactivated.");
});
