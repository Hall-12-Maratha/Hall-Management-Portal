# DELETE /api/hall-office/staff/{user_id}

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/staff/[user_id]/route.ts`
**FastAPI origin:** `backend/app/routers/hall_office.py::delete_staff_account`

Delete a staff account permanently. Records the account touched are kept:
`served_by` on bookings is cleared, and items, notices, menu edits, wastage
entries and roll uploads they created are re-attributed to the hall office user
performing the deletion.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

- Path params: `user_id` (integer)

## Response

`200`:

```json
{ "message": "Staff account deleted." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Staff account not found.` | no mess_staff / mess_worker with this id |
| 422 | `user_id: must be an integer.` | bad path param |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- In one transaction: clears `extras_bookings.served_by`, re-attributes
  `extras_items.created_by`, `notices.created_by`, `weekly_menu.updated_by`,
  `wastage_logs.entered_by`, `allowed_roll_numbers.uploaded_by` and clears
  `users.created_by`, then deletes the `users` row.

## Business rules

- Use `PATCH` with `is_active: false` to suspend an account without deleting it.

## Changes vs FastAPI

- Hard delete with re-attribution (FastAPI only deactivated).
