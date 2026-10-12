/**
 * Refresh-token cookie helpers.
 *
 * Cookie: `refresh_token`, httpOnly, path=/, max-age = REFRESH_TOKEN_EXPIRE_DAYS,
 * `secure` and `sameSite` from the environment (same-origin now, so `lax`).
 */

import type { NextRequest, NextResponse } from "next/server";

import { getEnv } from "../env";

export const REFRESH_COOKIE_NAME = "refresh_token";

function baseAttributes() {
  const env = getEnv();
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
  } as const;
}

export function setRefreshCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: token,
    maxAge: getEnv().REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    ...baseAttributes(),
  });
}

export function clearRefreshCookie(res: NextResponse): void {
  res.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: "",
    maxAge: 0,
    expires: new Date(0),
    ...baseAttributes(),
  });
}

export function readRefreshCookie(req: NextRequest): string | undefined {
  return req.cookies.get(REFRESH_COOKIE_NAME)?.value || undefined;
}
