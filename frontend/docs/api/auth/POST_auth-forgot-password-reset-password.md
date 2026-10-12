# POST /api/auth/forgot-password/reset-password

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/forgot-password/reset-password/route.ts`
**FastAPI origin:** `backend/app/routers/auth.py::forgot_password_reset`

Step 3 of password recovery: set a new password with the reset token and log in.

## Auth

- Header: none (the `reset_token` in the body is the credential)
- Roles: public

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| reset_token | string | yes | token from verify-otp |
| new_password | string | yes | 8..128 characters, at most 72 bytes |

## Response

`200` LoginResponse + `Set-Cookie: refresh_token=...`.

## Errors

| Status | `detail` | When |
|---|---|---|
| 400 | `Invalid or expired reset token.` | bad signature, expired, wrong `type`, or already used |
| 400 | `User not found.` | no user for the email in the token |
| 403 | `Account is deactivated. Contact the hall office.` | user is inactive |
| 422 | `<field>: <message>` | validation |

## Side effects

- Updates `users.password_hash`; issues access + refresh tokens.

## Business rules

- Single use: the token's `pwf` claim must match the current password hash.

## Changes vs FastAPI

- Reset tokens are single-use (fingerprint check).
- Inactive accounts cannot reset their password (403).
