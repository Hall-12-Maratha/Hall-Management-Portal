/**
 * POST /api/staff/items/{item_id}/bookings/bulk-delete - hard-delete every
 * booking of an item after re-entering the staff password.
 * Port of routers/staff.py::bulk_delete_bookings.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { verifyPassword } from "@/lib/server/auth/password";
import { getDb } from "@/lib/server/db/client";
import { extrasBookings } from "@/lib/server/db/schema";
import { handleRoute, httpError, message, parseIntParam, parseJsonBody } from "@/lib/server/http";
import { bulkDeleteSchema } from "@/lib/server/schemas/extras";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  const me = await requireRole(req, "mess_staff");
  const { id } = await ctx.params;
  const itemId = parseIntParam(id, "item_id");
  const body = await parseJsonBody(req, bulkDeleteSchema);

  if (!(await verifyPassword(body.password, me.passwordHash))) {
    httpError(401, "Invalid password.");
  }

  const deleted = await getDb()
    .delete(extrasBookings)
    .where(eq(extrasBookings.itemId, itemId))
    .returning({ id: extrasBookings.id });

  return message(`Deleted ${deleted.length} bookings.`);
});
