# POST /api/staff/items

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/items/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::create_item`

Create an extras item. Booking opens 48 hours before `closes_at`.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| name | string | yes | 1..255 characters |
| price | number | yes | > 0 (stored with 2 decimals) |
| date | string | yes | YYYY-MM-DD (meal date) |
| meal_type | string | yes | breakfast \| lunch \| dinner |
| closes_at | string | yes | ISO-8601 datetime (naive values are UTC) |
| is_recurring | boolean | no | default false |
| recurring_weekday | integer \| null | no | 0..6 (0 = Monday) |

## Response

`201` ItemResponse (see README). `opens_at = closes_at - 48h`,
`prep_time_mins` = minutes between open and close (2880), `is_active = true`.

## Errors

| Status | `detail` | When |
|---|---|---|
| 422 | `<field>: <message>` | validation (e.g. `price: Too small: expected number to be >0`) |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Inserts an `extras_items` row with `created_by` = caller.

## Business rules

- When `is_recurring` is true and `recurring_weekday` is omitted, the weekday
  of `date` is stored; when `is_recurring` is false the weekday is `null`.
- Recurring templates are cloned for matching weekdays by the maintenance job.

## Changes vs FastAPI

- None.
