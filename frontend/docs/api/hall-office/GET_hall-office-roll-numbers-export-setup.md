# GET /api/hall-office/roll-numbers/export-setup

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/roll-numbers/export-setup/route.ts`
**FastAPI origin:** `backend/app/routers/hall_office.py::export_setup_codes`

Download setup codes for every allowed roll as CSV. Generates missing codes
for rolls that have not registered and clears codes of rolls that have.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

No parameters.

## Response

`200`, `Content-Type: text/csv; charset=utf-8`,
`Content-Disposition: attachment; filename=student_setup_codes_<YYYYMMDD_HHmmss>.csv`.

Columns: `Roll No, Name, Email, Room Number, Setup Code, Status` where Status is
`Pending Setup` (with an 8-character code) or `Already Registered` (code `-`).

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- This GET writes: new `setup_code` values (`[A-Z0-9]{8}`, cryptographically
  random) for pending rolls, and `NULL` for registered rolls.

## Business rules

- A roll is "registered" when a student user has the roll's email as
  identifier (case-insensitive) or the same `roll_no`.
- Codes are distributed out of band (mail merge); no email is sent.

## Changes vs FastAPI

- The filename carries an India-time timestamp.
