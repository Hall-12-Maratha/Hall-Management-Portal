# POST /api/auth/forgot-password/request-otp

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/forgot-password/request-otp/route.ts`
**FastAPI origin:** `backend/app/routers/auth.py::forgot_password_request_otp`

Step 1 of password recovery: email a 6-digit OTP to a registered account.

## Auth

- Header: none
- Roles: public

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| email | string | yes | valid email; trimmed and lower-cased |

## Response

`200` always (even when the account does not exist, to avoid enumeration):

```json
{ "message": "If the email is registered, an OTP has been sent." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 429 | `Too many OTP requests. Please wait 15 minutes.` | 4th request for the same email within 15 min |
| 422 | `<field>: <message>` | validation |

## Side effects

- Counts the request on rate-limit key `otp:<email>` (counted whether or not the user exists).
- When a user with `lower(identifier) = email` and `password_set` exists: stores
  `otp_hash` (bcrypt), `otp_expires_at = now + 10 min`, `otp_attempts = 0`, then
  sends the email (SMTP when configured, otherwise the server console).

## Business rules

- Subject: `Hall 12 - Your Verification Code`. Body contains the code and a
  10-minute expiry note.
- An SMTP failure surfaces as `500 Internal server error.`

## Changes vs FastAPI

- Rate limit is stored in Postgres instead of process memory.
