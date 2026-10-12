# POST /api/worker/bookings/{booking_id}/serve

**Group:** worker
**Implementation:** `frontend/src/app/api/worker/bookings/[id]/serve/route.ts`
**FastAPI origin:** none (new; the FastAPI manual queue reused `POST /worker/scan`)

Mark an active booking served from the manual queue, by id. Works whether or
not QR scanning is enabled.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_worker

## Request

- Path params: `booking_id` (integer). No body.

## Response

`200`:

```json
{ "message": "Marked as served.", "booking_id": 9, "item_name": "Paneer Tikka",
  "qty": 3, "student_identifier": "230001@iitk.ac.in" }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Booking not found.` | unknown id |
| 400 | `Booking already served.` | status is `served` |
| 409 | `Booking is <status> and cannot be served.` | cancelled / missed / cancel requested |
| 422 | `booking_id: must be an integer.` | bad path param |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- One atomic `UPDATE ... WHERE id = ? AND status = 'booked'` setting
  `status = served`, `qr_used_at = now`, `served_by` = caller.

## Business rules

- Same state machine as `POST /api/worker/scan`, keyed by id instead of QR token.

## Changes vs FastAPI

- New endpoint. In FastAPI the queue's "Serve" button called `/worker/scan`,
  which returns 503 while `QR_SCANNING_ENABLED` is false, so the manual queue
  could not serve anything in production.
