# DELETE /api/staff/items/{item_id}

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/items/[id]/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::delete_item`

Deactivate an item (soft delete) so booking history is preserved.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

- Path params: `item_id` (integer)

## Response

`200`:

```json
{ "message": "Item deactivated." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Item not found.` | unknown id |
| 422 | `item_id: must be an integer.` | bad path param |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Sets `is_active = false`; existing bookings are untouched.

## Business rules

- Inactive items disappear from `GET /api/items` and cannot be booked.

## Changes vs FastAPI

- None.
