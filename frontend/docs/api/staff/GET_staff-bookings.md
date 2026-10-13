# GET /api/staff/bookings

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/bookings/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::list_all_bookings`

Every booking with student and item details, newest first.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

- Query params (all optional): `date` (YYYY-MM-DD, exact service date),
  `start_date` / `end_date` (YYYY-MM-DD, inclusive service-date range), `item_id`
  (integer), `search` (case-insensitive substring of student name or identifier).

## Response

`200` list of StaffBookingResponse ordered by `booked_at` descending:

```json
{ "id": 9, "student_identifier": "abc24@iitk.ac.in", "student_name": "Test Student", "student_roll_no": "230001",
  "item_name": "Paneer Tikka", "item_date": "2026-10-13", "meal_type": "dinner",
  "qty": 3, "total_price": 135, "status": "served",
  "booked_at": "2026-10-12T10:00:00.000Z", "qr_used_at": "2026-10-13T13:00:00.000Z",
  "closes_at": "2026-10-13T14:00:00.000Z" }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 422 | `date: Invalid date, expected YYYY-MM-DD.` | bad date |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- May run the missed-bookings job first (throttled to once per 5 minutes).

## Business rules

- Inner joins on student and item, so orphaned rows are not listed.

## Changes vs FastAPI

- Single joined query instead of per-row lookups; lazy missed-bookings maintenance;
  optional `start_date` / `end_date` range filter.
