/**
 * POST /api/auth/logout - clear the refresh cookie.
 * Port of routers/auth.py::logout.
 */

import { clearRefreshCookie } from "@/lib/server/auth/cookies";
import { handleRoute, json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async () => {
  const res = json({ message: "Logged out." });
  clearRefreshCookie(res);
  return res;
});
