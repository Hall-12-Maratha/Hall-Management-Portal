# POST /api/staff/bookings/trigger-missed

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/bookings/trigger-missed/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::trigger_missed_bookings`

Run the missed-bookings check immediately.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

No body.

## Response

`200`:

```json
{ "message": "Successfully ran the missed bookings check for past meals." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Sets `status = missed` on `booked` / `cancel_requested` bookings whose meal
  has passed: item date before today (India), or today with the cutoff passed
  (breakfast 09:30, lunch 14:30, dinner 21:30 IST).

## Business rules

- Job errors are logged and the message is still returned (same as FastAPI).

## Changes vs FastAPI

- None.
