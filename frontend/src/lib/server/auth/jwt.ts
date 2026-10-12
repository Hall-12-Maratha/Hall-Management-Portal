/**
 * JWT helpers - HS256 via `jose`, with claims identical to the python-jose
 * tokens the FastAPI backend issued, so JWT_SECRET and any in-flight tokens
 * remain compatible.
 *
 * Token types:
 *   access          {sub, role, type:"access", exp}            ACCESS_TOKEN_EXPIRE_MINUTES
 *   refresh         {sub, role, type:"refresh", exp}           REFRESH_TOKEN_EXPIRE_DAYS
 *   signup (reset)  {email, type:"signup", pwf, exp}           10 minutes
 *   change_password {sub, type:"change_password", exp}         10 minutes
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { getEnv } from "../env";

export type TokenType = "access" | "refresh" | "signup" | "change_password";

export interface HmpTokenPayload extends JWTPayload {
  type?: TokenType;
  role?: string;
  email?: string;
  /** Password fingerprint: makes reset tokens single-use (see passwordFingerprint). */
  pwf?: string;
}

const SHORT_LIVED_SECONDS = 10 * 60;

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

async function sign(payload: Record<string, unknown>, lifetimeSeconds: number): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + lifetimeSeconds)
    .sign(secretKey());
}

export function createAccessToken(userId: number, role: string): Promise<string> {
  return sign(
    { sub: String(userId), role, type: "access" },
    getEnv().ACCESS_TOKEN_EXPIRE_MINUTES * 60
  );
}

export function createRefreshToken(userId: number, role: string): Promise<string> {
  return sign(
    { sub: String(userId), role, type: "refresh" },
    getEnv().REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
  );
}

/**
 * Short-lived token issued after OTP verification and consumed by reset-password.
 * `pwf` binds it to the current password hash so it cannot be replayed after use.
 */
export function createSignupToken(email: string, passwordHash: string): Promise<string> {
  return sign(
    { email, type: "signup", pwf: passwordFingerprint(passwordHash) },
    SHORT_LIVED_SECONDS
  );
}

export function createChangePasswordToken(userId: number): Promise<string> {
  return sign({ sub: String(userId), type: "change_password" }, SHORT_LIVED_SECONDS);
}

/** Verify signature + expiry. Returns the payload, or null on any failure. */
export async function decodeToken(token: string): Promise<HmpTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload as HmpTokenPayload;
  } catch {
    return null;
  }
}

/** Stable fingerprint of a bcrypt hash (the last 12 chars of the hash body). */
export function passwordFingerprint(passwordHash: string): string {
  return passwordHash.slice(-12);
}

/** Parse the `sub` claim as a user id, or null. */
export function subjectToUserId(payload: HmpTokenPayload): number | null {
  if (!payload.sub || !/^\d+$/.test(payload.sub)) return null;
  return Number(payload.sub);
}
