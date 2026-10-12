# POST /api/bookings

**Group:** bookings
**Implementation:** `frontend/src/app/api/bookings/route.ts`
**FastAPI origin:** `backend/app/routers/bookings.py::create_booking`

Place a booking for an extras item.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| item_id | integer | yes | |
| qty | integer | yes | 1..10 |

## Response

`201` BookingResponse:

```json
{ "id": 9, "item_id": 3, "item_name": "Paneer Tikka", "item_date": "2026-10-13",
  "meal_type": "dinner", "qty": 2, "total_price": 80, "status": "booked",
  "qr_token": "5f1c...32 hex", "booked_at": "2026-10-12T10:00:00.000Z",
  "qr_used_at": null, "closes_at": "2026-10-13T14:00:00.000Z" }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Item not found or is no longer available.` | unknown or inactive item |
| 400 | `Booking has not opened yet.` | `now < opens_at` |
| 400 | `Booking window has closed.` | `now >= closes_at` |
| 409 | `You already have a booking for this item. Modify the existing booking instead.` | an existing non-cancelled booking for this item |
| 422 | `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Inserts an `extras_bookings` row with `status = booked`, a random 32-hex
  `qr_token`, and `total_price = price x qty` locked at booking time.

## Business rules

- One active booking per student per item; cancelled bookings do not block a new one.

## Changes vs FastAPI

- None.
