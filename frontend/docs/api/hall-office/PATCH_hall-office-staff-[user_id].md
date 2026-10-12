# PATCH /api/hall-office/staff/{user_id}

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/staff/[user_id]/route.ts`
**FastAPI origin:** `backend/app/routers/hall_office.py::toggle_staff_status`

Activate or deactivate a staff account.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

- Path params: `user_id` (integer)
- Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| is_active | boolean | yes | |

## Response

`200`:

```json
{ "message": "Account activated." }
```

or `{ "message": "Account deactivated." }`.

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Staff account not found.` | no mess_staff / mess_worker with this id |
| 422 | `user_id: must be an integer.` / `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Updates `users.is_active`. Deactivated accounts get `403` on every request
  and `401` on refresh.

## Business rules

- Only staff roles can be toggled here; students are managed through the roll list.

## Changes vs FastAPI

- None.
