# DELETE /api/bookings/{booking_id}

**Group:** bookings
**Implementation:** `frontend/src/app/api/bookings/[id]/route.ts`
**FastAPI origin:** `backend/app/routers/bookings.py::cancel_booking`

Cancel an active booking while its window is still open (soft: status becomes `cancelled`).

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student (owner)

## Request

- Path params: `booking_id` (integer)

## Response

`200`:

```json
{ "message": "Booking cancelled." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Booking not found.` | not found or not owned |
| 400 | `Only active bookings can be cancelled.` | status is not `booked` |
| 400 | `Booking window has closed. Use request cancellation instead.` | `now >= closes_at` |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Sets `status = cancelled`; the row is kept for history.

## Business rules

- After the window closes, use `POST /api/bookings/{id}/request-cancel`.

## Changes vs FastAPI

- None.
