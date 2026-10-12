# POST /api/staff/bookings/{booking_id}/cancel-request/approve

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/bookings/[id]/cancel-request/[action]/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::approve_cancel_request`

Approve a student's cancellation request.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

- Path params: `booking_id` (integer). No body.

## Response

`200`:

```json
{ "message": "Cancellation request approved." }
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

- Sets `status = cancelled`.

## Business rules

- None.

## Changes vs FastAPI

- None.
