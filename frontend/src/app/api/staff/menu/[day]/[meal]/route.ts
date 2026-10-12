/**
 * PUT /api/staff/menu/{day}/{meal} - upsert one menu slot (mess staff).
 * Port of routers/menu.py::update_menu_slot.
 */

import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { MEAL_TYPES, weeklyMenu, type MealType } from "@/lib/server/db/schema";
import { handleRoute, httpError, json, parseIntParam, parseJsonBody } from "@/lib/server/http";
import { menuSlotUpdateSchema } from "@/lib/server/schemas/menu";
import { toMenuSlot } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ day: string; meal: string }> };

export const PUT = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  const me = await requireRole(req, "mess_staff");
  const { day: dayParam, meal } = await ctx.params;
  const day = parseIntParam(dayParam, "day");
  const body = await parseJsonBody(req, menuSlotUpdateSchema);

  if (day < 0 || day > 6) {
    httpError(400, "day must be 0 (Monday) to 6 (Sunday).");
  }
  if (!(MEAL_TYPES as readonly string[]).includes(meal)) {
    httpError(400, "meal must be 'breakfast', 'lunch', or 'dinner'.");
  }
  const mealType = meal as MealType;

  const db = getDb();
  const now = new Date();

  const [existing] = await db
    .select()
    .from(weeklyMenu)
    .where(and(eq(weeklyMenu.dayOfWeek, day), eq(weeklyMenu.mealType, mealType)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(weeklyMenu)
      .set({ description: body.description, updatedBy: me.id, updatedAt: now })
      .where(eq(weeklyMenu.id, existing.id))
      .returning();
    return json(toMenuSlot(updated));
  }

  const [inserted] = await db
    .insert(weeklyMenu)
    .values({
      dayOfWeek: day,
      mealType,
      description: body.description,
      updatedBy: me.id,
      updatedAt: now,
    })
    .returning();
  return json(toMenuSlot(inserted));
});
