# DELETE /api/hall-office/staff/{user_id}

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/staff/[user_id]/route.ts`
**FastAPI origin:** `backend/app/routers/hall_office.py::delete_staff_account`

Retire a staff account. The row is kept (deactivated) so audit references such
as `served_by` and `created_by` stay valid.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

- Path params: `user_id` (integer)

## Response

`200`:

```json
{ "message": "Staff account deactivated and retained for audit history." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Staff account not found.` | no mess_staff / mess_worker with this id |
| 422 | `user_id: must be an integer.` | bad path param |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Sets `is_active = false`.

## Business rules

- Identical effect to `PATCH` with `is_active: false`.

## Changes vs FastAPI

- None.
