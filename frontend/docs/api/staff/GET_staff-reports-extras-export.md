# GET /api/staff/reports/extras/export

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/reports/extras/export/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::export_extras_csv`

CSV report of extras consumption over a date range.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

- Query params: `start_date` (YYYY-MM-DD, required), `end_date` (YYYY-MM-DD,
  required), `report_type` (`student` default, or `detailed`).

## Response

`200`, `Content-Type: text/csv; charset=utf-8`,
`Content-Disposition: attachment; filename=extras_report_<type>_<start>_to_<end>_<YYYYMMDD_HHmmss>.csv`.

`student`: one row per student, sorted by roll number.
`Roll Number, Name, Room Number, Booking Count, Total Quantity, Total Amount (INR), Items`
where `Items` is `"Paneer Tikka x3; Samosa x1"`.

`detailed`: one row per booking ordered by date, meal, roll, item.
`Date, Meal, Roll Number, Name, Room Number, Item, Quantity, Status, Amount (INR)`.

## Errors

| Status | `detail` | When |
|---|---|---|
| 422 | `end_date: ...` etc. | missing or invalid params |
| 400 | `Start date cannot be after end date.` | range reversed |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- None.

## Business rules

- Includes bookings with status `booked`, `served` or `missed` (missed meals are billed).
- Roll Number is `users.roll_no`, falling back to the identifier's local part.

## Changes vs FastAPI

- The filename carries an India-time timestamp.
