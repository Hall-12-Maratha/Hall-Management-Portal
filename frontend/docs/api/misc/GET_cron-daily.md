# GET | POST /api/cron/daily

**Group:** misc
**Implementation:** `frontend/src/app/api/cron/daily/route.ts`
**FastAPI origin:** `backend/app/services/scheduler.py` (APScheduler jobs
`recreate_recurring_items` and `mark_missed_bookings`, previously hourly)

Scheduled maintenance entry point. Vercel Cron calls it once a day
(`vercel.json`: `30 16 * * *` UTC = 22:00 IST, after the dinner cutoff; Hobby
plans allow daily schedules only). The same jobs also run lazily, throttled,
from `GET /api/items`, `GET /api/staff/items`, `GET /api/bookings/me`,
`GET /api/staff/bookings` and `GET /api/worker/bookings/today`, so the cron is
a safety net rather than the only trigger.

## Auth

- Header: `Authorization: Bearer <CRON_SECRET>` (Vercel adds it automatically
  when the `CRON_SECRET` environment variable is set; compared in constant time)
- Roles: n/a

## Request

No parameters.

## Response

`200`:

```json
{ "ok": true, "ran_at": "2026-10-13T16:30:02.000Z",
  "recurring_created": 2, "missed_marked": 5, "rate_limits_purged": 11 }
```

A counter is `null` if that job threw (the error is logged; the others still run).

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 | `Unauthorized.` | missing/incorrect secret, or `CRON_SECRET` unset |

## Side effects

- `recurring_created`: clones active recurring templates whose weekday matches
  today (India) into one-off items for today, unless an active item with the
  same name and meal already exists for today. Clone keeps the template's
  time-of-day for `closes_at` and the same open/close window length.
- `missed_marked`: sets `status = missed` on `booked`/`cancel_requested`
  bookings whose meal has passed (IST cutoffs 09:30 / 14:30 / 21:30).
- `rate_limits_purged`: deletes rate-limit rows idle for more than a day.

## Business rules

- Self-hosting without cron: set `ENABLE_IN_PROCESS_SCHEDULER=true` and
  `src/instrumentation.ts` runs the same jobs hourly in-process.
- Manual run for staff: `POST /api/staff/bookings/trigger-missed`.

## Changes vs FastAPI

- Hourly APScheduler replaced by daily cron + lazy throttled runs (Vercel Hobby constraint).
