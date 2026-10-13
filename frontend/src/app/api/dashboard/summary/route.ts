/**
 * GET /api/dashboard/summary - student wastage summary.
 * Port of routers/dashboard.py::get_dashboard_summary.
 */

import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { getDashboardSummary } from "@/lib/server/dashboard";
import { handleRoute, json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "student");
  return json(await getDashboardSummary());
});
