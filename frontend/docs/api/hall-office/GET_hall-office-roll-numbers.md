# GET /api/hall-office/roll-numbers

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/roll-numbers/route.ts`
**FastAPI origin:** `backend/app/routers/hall_office.py::get_roll_numbers`

All allowed roll numbers, newest upload first.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

No parameters.

## Response

`200`:

```json
[ { "roll_no": "230001", "name": "Test Student", "email": "230001@iitk.ac.in",
    "room_number": "A-101", "setup_code": "K7Q2M9ZA",
    "uploaded_at": "2026-10-13T08:00:00.000Z", "uploaded_by": 1 } ]
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- None.

## Business rules

- `setup_code` is `null` once the student has completed setup.

## Changes vs FastAPI

- None.
