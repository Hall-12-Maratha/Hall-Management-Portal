# GET /api/hall-office/personal-notices

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/personal-notices/route.ts`
**FastAPI origin:** none (new)

Personal notices sent so far, newest first, at most 500. The hall office
page filters this list in the browser; filtering never costs a request.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

- Query params: `roll_no` (string, optional, at most 50 chars, matched upper-cased).

## Response

`200` list:

```json
[ { "id": 4, "roll_no": "230001", "student_name": "Test Student",
    "title": "October mess bill", "notice": "INR 3450, pay by 10 Nov.",
    "created_at": "2026-11-01T05:00:00.000Z", "created_by": 1 } ]
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- None.

## Business rules

- Inner join on the student, so notices of a hard-deleted student (cascade) are gone.

## Changes vs FastAPI

- New endpoint.
