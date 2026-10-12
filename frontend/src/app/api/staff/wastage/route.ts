/**
 * POST /api/staff/wastage - create or update today's wastage entry (India date).
 * GET  /api/staff/wastage - every entry, newest first.
 * Port of routers/staff.py::upsert_wastage / list_wastage.
 */

import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { istToday } from "@/lib/server/dates";
import { getDb } from "@/lib/server/db/client";
import { wastageLogs } from "@/lib/server/db/schema";
import { handleRoute, httpError, json, parseJsonBody } from "@/lib/server/http";
import { wastageCreateSchema } from "@/lib/server/schemas/wastage";
import { toWastage } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const me = await requireRole(req, "mess_staff");
  const body = await parseJsonBody(req, wastageCreateSchema);

  if (body.date !== istToday()) {
    httpError(400, "Wastage can only be entered or edited for today's date in India time.");
  }

  const db = getDb();
  const now = new Date();

  const [existing] = await db
    .select()
    .from(wastageLogs)
    .where(eq(wastageLogs.date, body.date))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(wastageLogs)
      .set({
        bdmr: body.bdmr,
        plainWastage: body.plain_wastage,
        plateWastage: body.plate_wastage,
        enteredBy: me.id,
        enteredAt: now,
      })
      .where(eq(wastageLogs.id, existing.id))
      .returning();
    return json(toWastage(updated));
  }

  const [inserted] = await db
    .insert(wastageLogs)
    .values({
      date: body.date,
      bdmr: body.bdmr,
      plainWastage: body.plain_wastage,
      plateWastage: body.plate_wastage,
      enteredBy: me.id,
      enteredAt: now,
    })
    .returning();
  return json(toWastage(inserted));
});

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "mess_staff");

  const logs = await getDb().select().from(wastageLogs).orderBy(desc(wastageLogs.date));
  return json(logs.map(toWastage));
});
