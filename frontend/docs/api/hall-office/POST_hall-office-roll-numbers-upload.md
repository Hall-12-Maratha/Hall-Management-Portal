# POST /api/hall-office/roll-numbers/upload

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/roll-numbers/upload/route.ts`
**FastAPI origin:** `backend/app/routers/hall_office.py::upload_roll_numbers`

Replace the whole allowed-roll list from a CSV and sync student activation.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

Body (`multipart/form-data`): field `file`, a `.csv` of at most 1 MB, UTF-8
(a BOM is accepted). Columns in order: `roll_no, name, email, room_number`.
A first row whose first cell is `roll`, `roll_no` or `roll_number`
(case-insensitive, spaces as underscores) is treated as a header. Blank rows
and rows with an empty roll are skipped. The `email` column is ignored: the
institute address `<roll>@iitk.ac.in` is always used.

## Response

`200`:

```json
{ "count": 412, "message": "412 roll numbers uploaded (replaced existing list)." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 422 | `file: Field required.` | no multipart `file` field |
| 400 | `File must be a .csv file.` | extension check |
| 400 | `File too large. Maximum size is 1MB.` | > 1,048,576 bytes |
| 400 | `File is not valid UTF-8 text.` | decoding failure |
| 400 | `Invalid roll number on CSV row N.` | roll not matching `[A-Za-z0-9-]{3,50}` (1-based row index incl. header/blank rows) |
| 400 | `CSV file contains no valid roll numbers.` | nothing to import |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

In one transaction:
- Deletes every `allowed_roll_numbers` row (including setup codes), inserts the
  de-duplicated rows (first occurrence wins, roll upper-cased), `uploaded_by` = caller.
- Deactivates student users whose identifier is not in the new email list and
  reactivates those that are.

## Business rules

- Run `GET /api/hall-office/roll-numbers/export-setup` afterwards to generate setup codes.

## Changes vs FastAPI

- None (BOM stripping and header detection existed in the latest FastAPI version).
