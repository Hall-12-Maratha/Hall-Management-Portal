# GET /api/items

**Group:** items
**Implementation:** `frontend/src/app/api/items/route.ts`
**FastAPI origin:** `backend/app/routers/items.py::list_available_items`

Extras a student can book right now.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student

## Request

No parameters.

## Response

`200` list of ItemResponse (see README), ordered by `opens_at` ascending.

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- May run the recurring-items job first if it has not run in the last 15
  minutes (creates today's clones of recurring templates). Failures are logged
  and never affect the response.

## Business rules

- Returned items satisfy all of: `is_active`, `opens_at <= now < closes_at`,
  and `date` between today and tomorrow in India time.

## Changes vs FastAPI

- The recurring-items maintenance that APScheduler ran hourly now also runs
  lazily from this endpoint (throttled), because Vercel Hobby offers only a
  daily cron.
