# PUT /api/bookings/{booking_id}?qty=

**Group:** bookings
**Implementation:** `frontend/src/app/api/bookings/[id]/route.ts`
**FastAPI origin:** `backend/app/routers/bookings.py::modify_booking`

Change the quantity of an active booking while its window is still open.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student (owner)

## Request

- Path params: `booking_id` (integer)
- Query params: `qty` (integer 1..10, required). There is no body.

## Response

`200`:

```json
{ "message": "Booking modified successfully.", "new_qty": 3, "new_total": 135 }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Booking not found.` | not found or not owned |
| 400 | `Only active bookings can be modified.` | status is not `booked` |
| 400 | `Booking window has closed.` | `now >= closes_at` |
| 422 | `qty: ...` | missing/out-of-range qty |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Updates `qty` and recomputes `total_price = item.price x qty` (current item price).

## Business rules

- None beyond the above.

## Changes vs FastAPI

- None.
