# GET /api/staff/items

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/items/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::list_all_items`

Every extras item (active and inactive) with its live bookings count, newest
service date first.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

No parameters.

## Response

`200` list of ItemResponse plus `bookings_count` (bookings whose status is not
`cancelled`), ordered by `date` descending then `created_at` descending.

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- May first generate upcoming occurrences of weekly items (throttled to once
  per 15 minutes).

## Business rules

- None.

## Changes vs FastAPI

- Adds `bookings_count` and orders by service date.
