# POST /api/hall-office/staff

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/staff/route.ts`
**FastAPI origin:** `backend/app/routers/hall_office.py::create_staff_account`

Create a mess_staff or mess_worker account with a one-time temporary password.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| name | string | yes | 1..255 |
| role | string | yes | `mess_staff` or `mess_worker` |

## Response

`200` (the password is shown once):

```json
{ "id": 7, "identifier": "MS-001", "name": "Staff One", "role": "mess_staff",
  "temp_password": "Q3x9...16 chars",
  "message": "Account created. Share this password securely - it will not be shown again." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 422 | `role: Must be 'mess_staff' or 'mess_worker'.` etc. | validation |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Inserts a user (`is_active`, `password_set`, `must_change_password = true`,
  `created_by` = caller). Identifier is `MS-NNN` / `MW-NNN` numbered from the
  count of users with that role, incremented until unique.

## Business rules

- First login returns `must_change_password`; the account must call
  `POST /api/auth/change-password` before getting a session.

## Changes vs FastAPI

- None.
