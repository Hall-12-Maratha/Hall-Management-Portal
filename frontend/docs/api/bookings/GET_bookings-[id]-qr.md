# GET /api/bookings/{booking_id}/qr

**Group:** bookings
**Implementation:** `frontend/src/app/api/bookings/[id]/qr/route.ts`
**FastAPI origin:** `backend/app/routers/bookings.py::get_booking_qr`

PNG QR code encoding the booking's `qr_token`, for the mess worker to scan.
Disabled unless `QR_SCANNING_ENABLED=true`.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student (owner of the booking)

## Request

- Path params: `booking_id` (integer)

## Response

`200`, `Content-Type: image/png`, `Cache-Control: no-store`. The image uses
error-correction level M, 10 px modules and a 4-module quiet zone.

## Errors

| Status | `detail` | When |
|---|---|---|
| 503 | `QR codes are temporarily disabled.` | feature flag off |
| 404 | `Booking not found.` | not found or not owned by the caller |
| 409 | `QR is available only for an active booking.` | status is not `booked` |
| 422 | `booking_id: must be an integer.` | bad path param |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- None.

## Business rules

- The client UI also hides the QR button unless `NEXT_PUBLIC_QR_SCANNING_ENABLED=true`.

## Changes vs FastAPI

- None.
