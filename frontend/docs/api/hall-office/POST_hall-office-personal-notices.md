# POST /api/hall-office/personal-notices

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/personal-notices/route.ts`
**FastAPI origin:** none (new)

Send one personal notice to one student by roll number.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| roll_no | string | yes | trimmed, 3..50 chars, `[A-Za-z0-9-]`, matched upper-cased |
| title | string | yes | trimmed, 1..255 |
| notice | string | yes | trimmed, 1..4000 |

## Response

`201`:

```json
{ "id": 4, "roll_no": "230001", "student_name": "Test Student",
  "title": "Warning", "notice": "Please settle your dues.",
  "created_at": "2026-11-01T05:00:00.000Z", "created_by": 1 }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `No student account with this roll number.` | roll unknown or student has not completed setup |
| 422 | `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Inserts one `personal_notices` row (`created_by` = caller).
- After the response, pushes a content-free notification to the student's devices.

## Business rules

- Only `student` accounts are matched.

## Changes vs FastAPI

- New endpoint.
