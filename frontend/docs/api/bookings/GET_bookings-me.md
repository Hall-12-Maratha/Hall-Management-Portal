# GET /api/bookings/me

**Group:** bookings
**Implementation:** `frontend/src/app/api/bookings/me/route.ts`
**FastAPI origin:** `backend/app/routers/bookings.py::get_my_bookings`

Own booking history plus the running bill.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student

## Request

- Query params: `start_date` (YYYY-MM-DD, optional), `end_date` (YYYY-MM-DD, optional); filter on the item's meal date.

## Response

`200`:

```json
{ "bookings": [ { "...BookingResponse" } ], "running_total": 135 }
```

Bookings are ordered by `booked_at` descending.

## Errors

| Status | `detail` | When |
|---|---|---|
| 422 | `start_date: Invalid date, expected YYYY-MM-DD.` | bad date |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- May run the missed-bookings job first if it has not run in the last 5
  minutes (marks past meals as `missed`). Failures are logged only.

## Business rules

- `running_total` ignores the date filters: it is the sum of `total_price`
  over all of the student's bookings whose status is not `cancelled` or
  `cancel_requested` (so `booked`, `served` and `missed` all count).

## Changes vs FastAPI

- Lazy missed-bookings maintenance (see Side effects).
