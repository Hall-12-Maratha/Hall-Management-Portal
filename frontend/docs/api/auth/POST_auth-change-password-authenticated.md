# POST /api/auth/change-password/authenticated

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/change-password/authenticated/route.ts`
**FastAPI origin:** `backend/app/routers/auth.py::change_authenticated_password`

Change the password of the logged-in account (student profile page).

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: any authenticated user

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| old_password | string | yes | current password |
| new_password | string | yes | 8..128 characters, at most 72 bytes |

## Response

`200`:

```json
{ "message": "Password changed successfully." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing/invalid token, inactive account |
| 400 | `Current password is incorrect.` | old password mismatch |
| 400 | `New password must be different from the current password.` | same value |
| 422 | `<field>: <message>` | validation |

## Side effects

- Updates `users.password_hash`. Existing sessions stay valid (tokens are stateless).

## Business rules

- None beyond the above.

## Changes vs FastAPI

- None.
