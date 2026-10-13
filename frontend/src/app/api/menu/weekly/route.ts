/**
 * GET /api/menu/weekly - read-only weekly menu (students and mess staff).
 * Port of routers/menu.py::get_weekly_menu.
 */

import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getMenuSlots } from "@/lib/server/dashboard";
import { handleRoute, json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "student", "mess_staff");
  return json({ slots: await getMenuSlots() });
});
