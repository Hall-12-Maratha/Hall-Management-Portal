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

- May first generate upcoming occurrences of weekly items (throttled to once
  per 15 minutes). Failures are logged and never affect the response.

## Business rules

- Returned items satisfy all of: `is_active`, `opens_at <= now < closes_at`
  (the window opens 72 hours before close) and `date` not before today in
  India time. Ordered by date, then meal, then close time. The staff Items
  page labels an item "Open" with exactly this rule.

## Changes vs FastAPI

- No date upper bound (FastAPI limited the list to today and tomorrow); the
  72-hour window is the only limit, so staff and students agree on what is open.
