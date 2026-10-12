# PUT /api/staff/items/{item_id}

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/items/[id]/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::update_item`

Partial update of an extras item. Only fields that are present and not `null` are applied.

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
| closes_at | string | ISO-8601; also resets `opens_at = closes_at - 48h` |
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

- Updates the `extras_items` row.

## Business rules

- If `recurring_weekday` is not sent but the item is recurring and `date`
  changes, the weekday of the new date is stored.

## Changes vs FastAPI

- None.
