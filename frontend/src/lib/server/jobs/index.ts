/**
 * Maintenance jobs.
 *
 * The FastAPI backend ran these hourly with APScheduler inside a long-lived
 * process. On Vercel there is no long-lived process, so the jobs run lazily
 * from the read endpoints that depend on their results, throttled through the
 * rate_limits table so each job runs at most once per interval across all
 * serverless instances:
 *
 *   recreateRecurringItems  <- GET /api/items, GET /api/staff/items
 *   markMissedBookings      <- GET /api/bookings/me, GET /api/staff/bookings,
 *                              GET /api/worker/bookings/today
 *
 * Mess staff can also force the missed check with
 * POST /api/staff/bookings/trigger-missed.
 */

import { purgeStaleRateLimits, tryAcquireThrottle } from "../rate-limit";
import { markMissedBookings } from "./missedBookings";
import { recreateRecurringItems } from "./recurringItems";

export const RECURRING_JOB_KEY = "job:recurring_items";
export const MISSED_JOB_KEY = "job:missed_bookings";
export const PURGE_JOB_KEY = "job:purge_rate_limits";

/** Minimum gap between lazy runs. */
export const RECURRING_JOB_INTERVAL_SECONDS = 15 * 60;
export const MISSED_JOB_INTERVAL_SECONDS = 5 * 60;
export const PURGE_JOB_INTERVAL_SECONDS = 24 * 60 * 60;

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
      // Piggyback the daily cleanup of idle rate-limit rows.
      if (await tryAcquireThrottle(PURGE_JOB_KEY, PURGE_JOB_INTERVAL_SECONDS)) {
        await purgeStaleRateLimits();
      }
    }
  } catch (err) {
    console.error("[jobs] lazy missed bookings run failed:", err);
  }
}

export { markMissedBookings, recreateRecurringItems };
