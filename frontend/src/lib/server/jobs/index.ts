/**
 * Maintenance jobs.
 *
 * The FastAPI backend ran these hourly with APScheduler inside a long-lived
 * process. On Vercel Hobby only one cron per day is available, so the jobs run:
 *   1. from GET /api/cron/daily (Vercel Cron, safety net), and
 *   2. lazily from the read endpoints that depend on their results, throttled
 *      through the rate_limits table so each job runs at most once per
 *      interval across all serverless instances.
 */

import { purgeStaleRateLimits, tryAcquireThrottle } from "../rate-limit";
import { markMissedBookings } from "./missedBookings";
import { recreateRecurringItems } from "./recurringItems";

export const RECURRING_JOB_KEY = "job:recurring_items";
export const MISSED_JOB_KEY = "job:missed_bookings";

/** Minimum gap between lazy runs. */
export const RECURRING_JOB_INTERVAL_SECONDS = 15 * 60;
export const MISSED_JOB_INTERVAL_SECONDS = 5 * 60;

export interface MaintenanceResult {
  recurring_created: number | null;
  missed_marked: number | null;
  rate_limits_purged: number | null;
}

/** Run every job unconditionally (cron / manual trigger). */
export async function runAllJobs(): Promise<MaintenanceResult> {
  const result: MaintenanceResult = {
    recurring_created: null,
    missed_marked: null,
    rate_limits_purged: null,
  };

  try {
    result.recurring_created = await recreateRecurringItems();
  } catch (err) {
    console.error("[jobs] recreateRecurringItems failed:", err);
  }
  try {
    result.missed_marked = await markMissedBookings();
  } catch (err) {
    console.error("[jobs] markMissedBookings failed:", err);
  }
  try {
    result.rate_limits_purged = await purgeStaleRateLimits();
  } catch (err) {
    console.error("[jobs] purgeStaleRateLimits failed:", err);
  }

  return result;
}

/** Run the recurring-items job if its throttle interval has elapsed. Never throws. */
export async function ensureRecurringItemsFresh(): Promise<void> {
  try {
    if (await tryAcquireThrottle(RECURRING_JOB_KEY, RECURRING_JOB_INTERVAL_SECONDS)) {
      await recreateRecurringItems();
    }
  } catch (err) {
    console.error("[jobs] lazy recurring items run failed:", err);
  }
}

/** Run the missed-bookings job if its throttle interval has elapsed. Never throws. */
export async function ensureMissedBookingsFresh(): Promise<void> {
  try {
    if (await tryAcquireThrottle(MISSED_JOB_KEY, MISSED_JOB_INTERVAL_SECONDS)) {
      await markMissedBookings();
    }
  } catch (err) {
    console.error("[jobs] lazy missed bookings run failed:", err);
  }
}

export { markMissedBookings, recreateRecurringItems };
