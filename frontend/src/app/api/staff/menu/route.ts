/**
 * GET /api/staff/menu - full weekly menu for editing (mess staff).
 * Port of routers/menu.py::get_staff_menu.
 */

import { asc } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { weeklyMenu } from "@/lib/server/db/schema";
import { handleRoute, json } from "@/lib/server/http";
import { toMenuSlot } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "mess_staff");

  const slots = await getDb()
    .select()
    .from(weeklyMenu)
    .orderBy(asc(weeklyMenu.dayOfWeek), asc(weeklyMenu.mealType));

  return json({ slots: slots.map(toMenuSlot) });
});
