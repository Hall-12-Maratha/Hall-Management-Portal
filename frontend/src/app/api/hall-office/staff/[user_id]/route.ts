/**
 * PATCH  /api/hall-office/staff/{user_id} - activate / deactivate a staff account.
 * DELETE /api/hall-office/staff/{user_id} - delete the account (records it
 *        touched are kept and re-attributed).
 * Port of routers/hall_office.py::toggle_staff_status / delete_staff_account.
 */

import { and, eq, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import {
  allowedRollNumbers,
  extrasBookings,
  extrasItems,
  notices,
  users,
  wastageLogs,
  weeklyMenu,
} from "@/lib/server/db/schema";
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
  const me = await requireRole(req, "hall_office");
  const { user_id } = await ctx.params;
  const userId = parseIntParam(user_id, "user_id");

  const user = await loadStaff(userId);

  // Hard delete. Records the account touched are kept: served_by is cleared,
  // and ownership of items, notices, menu edits and wastage entries passes to
  // the hall office user performing the deletion so foreign keys stay valid.
  await getDb().transaction(async (tx) => {
    await tx.update(extrasBookings).set({ servedBy: null }).where(eq(extrasBookings.servedBy, user.id));
    await tx.update(extrasItems).set({ createdBy: me.id }).where(eq(extrasItems.createdBy, user.id));
    await tx.update(notices).set({ createdBy: me.id }).where(eq(notices.createdBy, user.id));
    await tx.update(weeklyMenu).set({ updatedBy: me.id }).where(eq(weeklyMenu.updatedBy, user.id));
    await tx.update(wastageLogs).set({ enteredBy: me.id }).where(eq(wastageLogs.enteredBy, user.id));
    await tx.update(users).set({ createdBy: null }).where(eq(users.createdBy, user.id));
    await tx.update(allowedRollNumbers).set({ uploadedBy: me.id }).where(eq(allowedRollNumbers.uploadedBy, user.id));
    await tx.delete(users).where(eq(users.id, user.id));
  });

  return message("Staff account deleted.");
});
