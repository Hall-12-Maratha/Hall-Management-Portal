# POST /api/staff/items/{item_id}/bookings/bulk-delete

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/items/[id]/bookings/bulk-delete/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::bulk_delete_bookings`

Hard-delete every booking of an item after re-entering the staff password.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

- Path params: `item_id` (integer)
- Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| password | string | yes | the caller's own password |

## Response

`200`:

```json
{ "message": "Deleted 12 bookings." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 | `Invalid password.` | password does not match the caller's account |
| 422 | `item_id: must be an integer.` / `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Permanently deletes `extras_bookings` rows for the item (no status filter).

## Business rules

- An unknown item simply yields `Deleted 0 bookings.`

## Changes vs FastAPI

- None.
