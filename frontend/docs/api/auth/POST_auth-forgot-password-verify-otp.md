# POST /api/auth/forgot-password/verify-otp

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/forgot-password/verify-otp/route.ts`
**FastAPI origin:** `backend/app/routers/auth.py::forgot_password_verify_otp`

Step 2 of password recovery: exchange a valid OTP for a short-lived reset token.

## Auth

- Header: none
- Roles: public

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| email | string | yes | valid email; trimmed and lower-cased |
| otp | string | yes | exactly 6 characters |

## Response

`200`:

```json
{ "reset_token": "<jwt, 10 min>", "message": "OTP verified. Set your new password." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 400 | `Invalid request.` | no user for the email, or `password_set` is false |
| 400 | `OTP has expired. Please request a new one.` | no `otp_expires_at` or it is in the past |
| 429 | `Too many attempts. Please request a new OTP.` | `otp_attempts` already >= 5 |
| 400 | `Invalid OTP. Please try again.` | bcrypt mismatch (increments `otp_attempts`) |
| 422 | `<field>: <message>` | validation |

## Side effects

- Wrong code: `otp_attempts += 1`.
- Success: clears `otp_hash` and `otp_expires_at`; issues a `signup`-type JWT
  bound to the current password hash (`pwf` claim).

## Business rules

- The reset token is valid for 10 minutes and for one password change only.

## Changes vs FastAPI

- The reset token carries a fingerprint of the current password hash so it
  cannot be replayed after the password is changed.
