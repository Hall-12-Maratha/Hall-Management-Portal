/**
 * POST /api/staff/bookings/trigger-missed - run the missed-bookings check now.
 * Port of routers/staff.py::trigger_missed_bookings.
 */

import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/server/auth/guard";
import { handleRoute, message } from "@/lib/server/http";
import { markMissedBookings } from "@/lib/server/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  await requireRole(req, "mess_staff");

  try {
    await markMissedBookings();
  } catch (err) {
    // Same as the APScheduler job: log and report success of the trigger itself.
    console.error("[staff] trigger-missed failed:", err);
  }

  return message("Successfully ran the missed bookings check for past meals.");
});
