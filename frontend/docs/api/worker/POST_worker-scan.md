# POST /api/worker/scan

**Group:** worker
**Implementation:** `frontend/src/app/api/worker/scan/route.ts`
**FastAPI origin:** `backend/app/routers/worker.py::scan_qr`

Mark a booking served by its QR token (used by the camera scanner and the
"Serve" button of the manual queue). Disabled unless `QR_SCANNING_ENABLED=true`.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_worker

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| qr_token | string | yes | min 1 |

## Response

`200` on success:

```json
{ "message": "Marked as served.", "booking_id": 9, "item_name": "Paneer Tikka",
  "qty": 3, "student_identifier": "230001@iitk.ac.in" }
```

`200` when the token was already used:

```json
{ "already_served": true, "served_at": "2026-10-13T13:00:00.000Z",
  "message": "This QR code was already used." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 503 | `QR scanning is temporarily disabled. Use the manual queue instead.` | feature flag off |
| 404 | `QR code not recognized.` | no booking with this token |
| 409 | `Booking is <status> and cannot be served.` | status is cancelled / missed / cancel requested |
| 422 | `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- One atomic `UPDATE ... WHERE qr_token = ? AND status = 'booked'` setting
  `status = served`, `qr_used_at = now`, `served_by` = caller, so two
  simultaneous scans cannot both succeed.

## Business rules

- The manual queue (`GET /api/worker/bookings/today`) exposes `qr_token` so
  workers can serve without a camera while the flag is on.

## Changes vs FastAPI

- None.
