/**
 * GET /api/auth/me - current user profile.
 * Port of routers/auth.py::get_me.
 */

import type { NextRequest } from "next/server";

import { requireUser } from "@/lib/server/auth/guard";
import { handleRoute, json } from "@/lib/server/http";
import { toUserBrief } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireUser(req);
  return json(toUserBrief(user));
});
