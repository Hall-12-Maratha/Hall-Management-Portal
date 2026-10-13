# POST /api/staff/items

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/items/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::create_item`

Create an extras item. Booking opens 72 hours before `closes_at`. With
`is_recurring: true` the item is a **weekly rule**: it repeats every week on
`recurring_weekday` (or the weekday of `date`), and its `date` is the first
service day. Upcoming weeks are generated automatically as plain occurrences
(`is_recurring: false`) with the same name, price, meal and close time of day.

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

`201` ItemResponse with `bookings_count: 0`. `opens_at = closes_at - 72h`,
`prep_time_mins` = minutes between open and close (4320), `is_active = true`.

## Errors

| Status | `detail` | When |
|---|---|---|
| 400 | `closes_at must be in the future.` | close time already passed |
| 422 | `<field>: <message>` | validation (e.g. `price: Too small: expected number to be >0`) |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Inserts an `extras_items` row with `created_by` = caller. For a weekly rule,
  immediately generates its occurrences for the next 7 days (see
  `lib/server/jobs/recurringItems.ts`); later weeks are generated lazily by
  `GET /api/items` / `GET /api/staff/items`.

## Business rules

- When `is_recurring` is true and `recurring_weekday` is omitted, the weekday
  of `date` is stored; when `is_recurring` is false the weekday is `null`.
- An occurrence is never regenerated for a date that already has a row with
  the same name and meal, even a deactivated one, so stopping one week sticks.
- Students see an occurrence only once its own window opens (72 h before close).

## Changes vs FastAPI

- The booking window is 72 hours instead of 48.
- Occurrences are generated up to 7 days ahead instead of only on the day.
