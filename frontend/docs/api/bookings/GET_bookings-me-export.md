# GET /api/bookings/me/export

**Group:** bookings
**Implementation:** `frontend/src/app/api/bookings/me/export/route.ts`
**FastAPI origin:** `backend/app/routers/bookings.py::export_my_bookings`

Download the full booking history as CSV.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student

## Request

No parameters.

## Response

`200`, `Content-Type: text/csv; charset=utf-8`,
`Content-Disposition: attachment; filename=my_bookings_history_<YYYYMMDD_HHmmss>.csv`.

Columns: `Date, Meal, Item, Quantity, Price (INR), Status, Booked At`.
Rows ordered by item date descending, then `booked_at` descending. `Meal` is
capitalised, `Status` upper-cased, `Price` has two decimals, `Booked At` is
`YYYY-MM-DD HH:MM` UTC. Lines end with CRLF.

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- None.

## Business rules

- Includes every status, including cancelled bookings.

## Changes vs FastAPI

- The filename carries an India-time timestamp.
