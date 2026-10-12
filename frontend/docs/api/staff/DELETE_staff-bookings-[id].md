# DELETE /api/staff/bookings/{booking_id}

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/bookings/[id]/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::delete_booking_staff`

Staff-side cancellation of a booking (soft: status becomes `cancelled`).

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

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
| 404 | `Booking not found.` | unknown id |
| 400 | `A served booking cannot be cancelled.` | status is `served` |
| 422 | `booking_id: must be an integer.` | bad path param |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Sets `status = cancelled`.

## Business rules

- Works on `booked`, `missed`, `cancel_requested` and already `cancelled` bookings.

## Changes vs FastAPI

- None.
