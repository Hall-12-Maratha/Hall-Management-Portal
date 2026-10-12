# GET /api/menu/weekly

**Group:** menu
**Implementation:** `frontend/src/app/api/menu/weekly/route.ts`
**FastAPI origin:** `backend/app/routers/menu.py::get_weekly_menu`

Read-only weekly mess menu (7 days x 3 meals).

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student, mess_staff

## Request

No parameters.

## Response

`200`:

```json
{ "slots": [
  { "id": 1, "day_of_week": 0, "meal_type": "lunch", "description": "Rajma Chawal",
    "updated_by": 2, "updated_at": "2026-10-13T09:00:00.000Z" }
] }
```

Ordered by `day_of_week` (0 = Monday) then `meal_type` (breakfast, lunch, dinner).
Only slots that have been saved at least once are present.

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role (`Access denied. Required role(s): student, mess_staff.`) |

## Side effects

- None.

## Business rules

- None.

## Changes vs FastAPI

- None.
