# DELETE /api/staff/items/{item_id}

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/items/[id]/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::delete_item`

Without `permanent`: deactivate the item (soft delete) so booking history is
preserved. For a weekly rule this stops it: upcoming occurrences without
bookings are deactivated too and no new ones are generated. Restart it with
`PUT ... { "is_active": true }`.

With `?permanent=true`: remove the row for good. Refused while the item has
any booking; a weekly rule also drops its upcoming unbooked occurrences.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

- Path params: `item_id` (integer)
- Query params: `permanent` (`true` / `1`, optional)

## Response

`200`:

```json
{ "message": "Item deactivated." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Item not found.` | unknown id |
| 409 | `This item has N bookings and cannot be deleted. Stop it instead, or clear its bookings first.` | `permanent=true` on an item with bookings |
| 422 | `item_id: must be an integer.` | bad path param |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Sets `is_active = false` on the item (and, for a weekly rule, on its future
  unbooked occurrences); existing bookings are untouched.

## Business rules

- Inactive items disappear from `GET /api/items` and cannot be booked.

## Changes vs FastAPI

- Adds permanent deletion (guarded by the bookings check) and weekly-rule propagation.
