/**
 * POST /api/auth/refresh - mint a new access token from the refresh cookie.
 * Port of routers/auth.py::refresh_token.
 *
 * Change vs FastAPI: the response also carries `user` so the client can
 * restore a session with a single request instead of refresh + /me.
 */

import type { NextRequest } from "next/server";

import { readRefreshCookie } from "@/lib/server/auth/cookies";
import { findUserById } from "@/lib/server/auth/guard";
import { createAccessToken, decodeToken, subjectToUserId } from "@/lib/server/auth/jwt";
import { handleRoute, httpError, json } from "@/lib/server/http";
import { toUserBrief } from "@/lib/server/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const token = readRefreshCookie(req);
  if (!token) {
    httpError(401, "No refresh token.");
  }

  const payload = await decodeToken(token);
  if (!payload || payload.type !== "refresh") {
    httpError(401, "Invalid or expired refresh token.");
  }

  const userId = subjectToUserId(payload);
  const user = userId === null ? undefined : await findUserById(userId);
  if (!user || !user.isActive) {
    httpError(401, "User not found or deactivated.");
  }

  return json({
    access_token: await createAccessToken(user.id, user.role),
    token_type: "bearer",
    user: toUserBrief(user),
  });
});
