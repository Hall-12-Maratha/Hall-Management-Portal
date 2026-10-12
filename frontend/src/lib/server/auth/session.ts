/**
 * Session issuance: access token in the JSON body, refresh token in an
 * httpOnly cookie. Shared by login, setup/complete, reset-password and the
 * forced change-password flow.
 */

import type { NextResponse } from "next/server";

import type { UserRow } from "../db/schema";
import { json } from "../http";
import { toUserBrief, type UserBrief } from "../serializers";
import { setRefreshCookie } from "./cookies";
import { createAccessToken, createRefreshToken } from "./jwt";

export interface LoginResponseBody {
  access_token: string;
  token_type: "bearer";
  user: UserBrief;
}

export async function buildLoginResponseBody(user: UserRow): Promise<LoginResponseBody> {
  return {
    access_token: await createAccessToken(user.id, user.role),
    token_type: "bearer",
    user: toUserBrief(user),
  };
}

/** 200 LoginResponse + Set-Cookie refresh_token. */
export async function issueSession(user: UserRow): Promise<NextResponse> {
  const body = await buildLoginResponseBody(user);
  const res = json(body, 200);
  setRefreshCookie(res, await createRefreshToken(user.id, user.role));
  return res;
}
