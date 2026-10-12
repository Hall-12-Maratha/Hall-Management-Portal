# PUT /api/staff/menu/{day}/{meal}

**Group:** menu
**Implementation:** `frontend/src/app/api/staff/menu/[day]/[meal]/route.ts`
**FastAPI origin:** `backend/app/routers/menu.py::update_menu_slot`

Create or update one menu slot.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

- Path params: `day` (integer 0..6, 0 = Monday), `meal` (`breakfast` | `lunch` | `dinner`)
- Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| description | string | yes | at most 1000 characters (may be empty) |

## Response

`200` MenuSlot:

```json
{ "id": 1, "day_of_week": 0, "meal_type": "lunch", "description": "Rajma Chawal",
  "updated_by": 2, "updated_at": "2026-10-13T09:00:00.000Z" }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 422 | `day: must be an integer.` | non-numeric `day` |
| 400 | `day must be 0 (Monday) to 6 (Sunday).` | out of range |
| 400 | `meal must be 'breakfast', 'lunch', or 'dinner'.` | unknown meal |
| 422 | `<field>: <message>` | body validation |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Upserts the `weekly_menu` row for (`day_of_week`, `meal_type`) with
  `updated_by` = caller and `updated_at` = now.

## Business rules

- The unique constraint `uq_day_meal` guarantees one row per slot.

## Changes vs FastAPI

- None.
