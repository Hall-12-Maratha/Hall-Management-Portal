/**
 * Database-backed rate limiting and job throttling.
 *
 * The FastAPI backend kept counters in process memory, which does not work on
 * serverless hosts (every instance would have its own counter and lose it on
 * cold start). This uses the `rate_limits` table with a fixed 15-minute window.
 *
 * Keys:
 *   otp:<email>        3 OTP requests / 15 min
 *   login:<identifier> 5 failed logins / 15 min (cleared on success)
 *   setup:<roll_no>    10 wrong setup codes / 15 min (cleared on success)
 *   job:<name>         throttle for the lazy maintenance jobs (see jobs/)
 */

import { getSql } from "./db/client";
import { httpError } from "./http";

export const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

export const OTP_LIMIT = 3;
export const LOGIN_LIMIT = 5;
export const SETUP_CODE_LIMIT = 10;

export const OTP_LIMIT_DETAIL = "Too many OTP requests. Please wait 15 minutes.";
export const LOGIN_LIMIT_DETAIL = "Too many login attempts. Account locked for 15 minutes.";
export const SETUP_LIMIT_DETAIL = "Too many attempts. Please wait 15 minutes.";

/** Number of hits recorded for `key` inside the current window (0 if none/expired). */
export async function currentCount(key: string): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ count: number }[]>`
    SELECT count
    FROM rate_limits
    WHERE key = ${key}
      AND window_start > now() - make_interval(secs => ${RATE_LIMIT_WINDOW_SECONDS})
  `;
  return rows[0]?.count ?? 0;
}

/** Throw 429 when `key` already has `limit` or more hits in the window. */
export async function assertUnderLimit(key: string, limit: number, detail: string): Promise<void> {
  if ((await currentCount(key)) >= limit) {
    httpError(429, detail);
  }
}

/** Record one hit for `key`, starting a fresh window if the old one expired. Returns the new count. */
export async function recordHit(key: string): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ count: number }[]>`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start <= now() - make_interval(secs => ${RATE_LIMIT_WINDOW_SECONDS}) THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start <= now() - make_interval(secs => ${RATE_LIMIT_WINDOW_SECONDS}) THEN now()
        ELSE rate_limits.window_start
      END
    RETURNING count
  `;
  return rows[0]?.count ?? 1;
}

/**
 * Check-then-record (FastAPI `check_otp_rate_limit` semantics): the request is
 * rejected once `limit` hits already exist in the window; otherwise it is counted.
 */
export async function consumeOrReject(key: string, limit: number, detail: string): Promise<void> {
  await assertUnderLimit(key, limit, detail);
  await recordHit(key);
}

export async function clearKey(key: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM rate_limits WHERE key = ${key}`;
}

/**
 * Atomic distributed throttle: returns true at most once per `intervalSeconds`
 * for `key`, across all server instances. Used to run maintenance lazily.
 */
export async function tryAcquireThrottle(key: string, intervalSeconds: number): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ key: string }[]>`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = rate_limits.count + 1,
      window_start = now()
    WHERE rate_limits.window_start <= now() - make_interval(secs => ${intervalSeconds})
    RETURNING key
  `;
  return rows.length === 1;
}

/** Remove counters that have been idle for more than a day. */
export async function purgeStaleRateLimits(): Promise<number> {
  const sql = getSql();
  const result = await sql`
    DELETE FROM rate_limits
    WHERE window_start < now() - interval '1 day'
  `;
  return result.count;
}

/** Normalise a login identifier for rate-limit keys (emails are case-insensitive). */
export function normalizeIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed;
}
