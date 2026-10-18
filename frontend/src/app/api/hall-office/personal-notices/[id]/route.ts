/**
 * DELETE /api/hall-office/personal-notices/{id} - remove one personal notice.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { personalNotices } from "@/lib/server/db/schema";
import { handleRoute, httpError, message, parseIntParam } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handleRoute<Ctx>(async (req: NextRequest, ctx) => {
  await requireRole(req, "hall_office");
  const { id: idParam } = await ctx.params;
  const id = parseIntParam(idParam, "id");

  const deleted = await getDb()
    .delete(personalNotices)
    .where(eq(personalNotices.id, id))
    .returning({ id: personalNotices.id });
  if (deleted.length === 0) {
    httpError(404, "Personal notice not found.");
  }

  return message("Personal notice deleted.");
});
