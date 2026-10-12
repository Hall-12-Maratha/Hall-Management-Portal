# POST /api/staff/bookings/{booking_id}/cancel-request/reject

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/bookings/[id]/cancel-request/[action]/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::reject_cancel_request`

Reject a student's cancellation request; the booking becomes active again.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

- Path params: `booking_id` (integer). No body.

## Response

`200`:

```json
{ "message": "Cancellation request rejected." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Booking not found.` | unknown id |
| 400 | `This booking has no pending cancellation request.` | status is not `cancel_requested` |
| 404 | `Not Found` | action segment other than approve/reject |
| 422 | `booking_id: must be an integer.` | bad path param |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Sets `status = booked`.

## Business rules

- None.

## Changes vs FastAPI

- None.
