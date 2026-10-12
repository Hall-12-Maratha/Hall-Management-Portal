# POST /api/bookings/{booking_id}/request-cancel

**Group:** bookings
**Implementation:** `frontend/src/app/api/bookings/[id]/request-cancel/route.ts`
**FastAPI origin:** `backend/app/routers/bookings.py::request_cancel_booking`

Ask the mess staff to cancel a booking whose window has already closed.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student (owner)

## Request

- Path params: `booking_id` (integer). No body.

## Response

`200`:

```json
{ "message": "Cancellation requested." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Booking not found.` | not found or not owned |
| 400 | `Cannot request cancellation for this booking.` | status is not `booked` |
| 400 | `Booking is still open. Cancel it directly instead.` | `now < closes_at` |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Sets `status = cancel_requested`.

## Business rules

- Staff resolve the request with `cancel-request/approve` (-> `cancelled`) or
  `cancel-request/reject` (-> `booked`). Until then the booking still counts
  in `running_total`? No: `cancel_requested` is excluded from the running total,
  and the missed-bookings job can still turn it into `missed` after the meal.

## Changes vs FastAPI

- None.
