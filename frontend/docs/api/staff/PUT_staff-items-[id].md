# PUT /api/staff/items/{item_id}

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/items/[id]/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::update_item`

Partial update of an extras item. Only fields that are present and not `null`
are applied. For a weekly rule, the new name, price, meal, close time of day
and active flag are also applied to its upcoming occurrences that have no
bookings yet; occurrences with bookings keep the terms students booked under.
Changing `recurring_weekday` (or `date`, which implies the weekday) moves the
rule: upcoming unbooked occurrences on the old day are deleted and new ones are
generated on the new day.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

- Path params: `item_id` (integer)
- Body (`application/json`), every field optional:

| Field | Type | Validation |
|---|---|---|
| name | string | 1..255 |
| price | number | > 0 |
| date | string | YYYY-MM-DD |
| meal_type | string | breakfast \| lunch \| dinner |
| closes_at | string | ISO-8601; also resets `opens_at = closes_at - 72h` |
| is_recurring | boolean | false also clears `recurring_weekday` |
| recurring_weekday | integer | 0..6 |
| is_active | boolean | |

## Response

`200` ItemResponse with the new values; `prep_time_mins` is recomputed.

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Item not found.` | unknown id |
| 422 | `item_id: must be an integer.` / `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Updates the `extras_items` row; for a weekly rule also its future unbooked
  occurrences, and generates any missing occurrences for the next 7 days.

## Business rules

- If `recurring_weekday` is not sent but the item is recurring and `date`
  changes, the weekday of the new date is stored.

## Changes vs FastAPI

- The booking window is 72 hours instead of 48.
