# GET /api/worker/bookings/today

**Group:** worker
**Implementation:** `frontend/src/app/api/worker/bookings/today/route.ts`
**FastAPI origin:** `backend/app/routers/worker.py::todays_bookings`

Active bookings for meals dated today (India time), oldest first.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_worker

## Request

No parameters.

## Response

`200`:

```json
[ { "id": 9, "item_name": "Paneer Tikka", "qty": 3,
    "student_identifier": "230001@iitk.ac.in", "qr_token": "5f1c...",
    "booked_at": "2026-10-12T10:00:00.000Z" } ]
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- May run the missed-bookings job first (throttled to once per 5 minutes).

## Business rules

- Only `status = booked`; served, missed and cancelled bookings are excluded.

## Changes vs FastAPI

- Lazy missed-bookings maintenance (see Side effects).
