# POST /api/staff/bookings/{booking_id}/serve

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/bookings/[id]/serve/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::serve_booking_staff`

Mark an active booking as served without scanning.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

- Path params: `booking_id` (integer). No body.

## Response

`200`:

```json
{ "message": "Booking marked as served." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Booking not found.` | unknown id |
| 400 | `Only an active booking can be served.` | status is not `booked` |
| 422 | `booking_id: must be an integer.` | bad path param |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Sets `status = served`, `qr_used_at = now`, `served_by` = caller.

## Business rules

- A `cancel_requested` booking must be rejected first to become servable.

## Changes vs FastAPI

- None.
