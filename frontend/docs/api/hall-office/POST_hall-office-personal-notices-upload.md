# POST /api/hall-office/personal-notices/upload

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/personal-notices/upload/route.ts`
**FastAPI origin:** none (new)

Send personal notices in bulk from a CSV (monthly bills, warnings). Each row
addresses one student by roll number. Bad rows are skipped and reported, the
rest are inserted in one transaction, and every addressed student receives
one push notification (content-free: "You have a personal notice").

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

Body (`multipart/form-data`): field `file`, a `.csv` of at most 1 MB, UTF-8
(a BOM is accepted). Columns in order: `roll, title, notice`. A first row
whose first cell is `roll`, `roll_no`, `rollno` or `roll_number`
(case-insensitive) is treated as a header. Blank rows are ignored. Quoted
cells may contain commas and line breaks. `title` at most 255 characters,
`notice` at most 4000.

## Response

`200`:

```json
{
  "count": 410,
  "skipped": [
    { "row": 7, "roll_no": "AB", "reason": "Invalid roll number." },
    { "row": 19, "roll_no": "230099", "reason": "No student account with this roll number." }
  ],
  "message": "410 notice(s) sent, 2 row(s) skipped."
}
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 422 | `file: Field required.` | no multipart `file` field |
| 400 | `File must be a .csv file.` | extension check |
| 400 | `File too large. Maximum size is 1MB.` | > 1,048,576 bytes |
| 400 | `File is not valid UTF-8 text.` | decoding failure |
| 400 | `CSV file contains no notices.` | only a header or blank rows |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Inserts `personal_notices` rows (`created_by` = caller) in one transaction.
- After the response, pushes `PERSONAL_NOTICE_PUSH` to every device of each
  addressed student (`lib/server/push.ts`); failures are logged, never returned.

## Business rules

- Rolls are matched against `users.roll_no` of student accounts (upper-cased).
  A roll that is on the allowed list but has not completed setup is skipped
  with `No student account with this roll number.`
- Skipped rows never fail the upload; `skipped` is empty on a clean file.
- Several rows for the same roll create several notices.

## Changes vs FastAPI

- New endpoint.
