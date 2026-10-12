/**
 * PATCH  /api/hall-office/staff/{user_id} - activate / deactivate a staff account.
 * DELETE /api/hall-office/staff/{user_id} - retire (deactivate) keeping audit history.
 * Port of routers/hall_office.py::toggle_staff_status / delete_staff_account.
 */

import { and, eq, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { users } from "@/lib/server/db/schema";
import { handleRoute, httpError, message, parseIntParam, parseJsonBody } from "@/lib/server/http";
import { staffToggleSchema } from "@/lib/server/schemas/hallOffice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ user_id: string }> };

async function loadStaff(userId: number) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(and(eq(users.id, userId), inArray(users.role, ["mess_staff", "mess_worker"])))
    .limit(1);
  if (!user) {
    httpError(404, "Staff account not found.");
  }
  return user;
}

export const PATCH = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  await requireRole(req, "hall_office");
  const { user_id } = await ctx.params;
  const userId = parseIntParam(user_id, "user_id");
  const body = await parseJsonBody(req, staffToggleSchema);

  const user = await loadStaff(userId);
  await getDb().update(users).set({ isActive: body.is_active }).where(eq(users.id, user.id));

  return message(`Account ${body.is_active ? "activated" : "deactivated"}.`);
});

export const DELETE = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  await requireRole(req, "hall_office");
  const { user_id } = await ctx.params;
  const userId = parseIntParam(user_id, "user_id");

  const user = await loadStaff(userId);
  await getDb().update(users).set({ isActive: false }).where(eq(users.id, user.id));

  return message("Staff account deactivated and retained for audit history.");
});
