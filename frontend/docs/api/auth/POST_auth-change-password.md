# POST /api/auth/change-password

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/change-password/route.ts`
**FastAPI origin:** `backend/app/routers/auth.py::change_password`

Forced password change for accounts created with a temporary password (new
mess staff / workers and the seeded admin). Consumes the `change_token` from login.

## Auth

- Header: none (the `change_token` in the body is the credential)
- Roles: public

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| change_token | string | yes | token from the login response |
| new_password | string | yes | 8..128 characters, at most 72 bytes |

## Response

`200` LoginResponse + `Set-Cookie: refresh_token=...`.

## Errors

| Status | `detail` | When |
|---|---|---|
| 400 | `Invalid or expired change-password token.` | bad signature, expired, wrong `type` |
| 404 | `User not found.` | subject no longer exists |
| 403 | `Account is deactivated. Contact the hall office.` | user is inactive |
| 422 | `<field>: <message>` | validation |

## Side effects

- Updates `password_hash`, sets `must_change_password = false`; issues tokens.

## Business rules

- The token is valid for 10 minutes after login.

## Changes vs FastAPI

- Inactive accounts are rejected (403).
