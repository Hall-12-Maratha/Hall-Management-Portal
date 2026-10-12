# DELETE /api/hall-office/roll-numbers/{roll_no}

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/roll-numbers/[roll_no]/route.ts`
**FastAPI origin:** `backend/app/routers/hall_office.py::delete_roll_number`

Remove an allowed roll and deactivate its student account.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

- Path params: `roll_no` (string, exact match; URL-decoded)

## Response

`200`:

```json
{ "message": "Roll number deleted successfully." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Roll number not found.` | unknown roll |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Deletes the `allowed_roll_numbers` row and sets `is_active = false` on the
  student whose identifier equals the roll's email (case-insensitive), in one transaction.

## Business rules

- Re-adding the roll (`POST`) reactivates the student.

## Changes vs FastAPI

- None.
