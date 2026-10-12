# POST /api/auth/setup/complete

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/setup/complete/route.ts`
**FastAPI origin:** `backend/app/routers/auth.py::setup_complete`

Step 2 of student account setup: set the password, create (or finish) the
student user, consume the setup code and start a session.

## Auth

- Header: none
- Roles: public

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| roll_no | string | yes | trimmed |
| setup_code | string | yes | exactly 8 characters |
| password | string | yes | 8..128 characters, at most 72 bytes |
| name | string | yes | 1..255 characters |
| room_no | string \| null | no | at most 50 characters |

## Response

`200` LoginResponse (`access_token`, `token_type: "bearer"`, `user: UserBrief`)
and `Set-Cookie: refresh_token=...; HttpOnly; Path=/; Max-Age=604800; SameSite=lax[; Secure]`.

## Errors

| Status | `detail` | When |
|---|---|---|
| 409 | `An account is already registered. Please log in.` | student with this roll_no already has `password_set` |
| 400 | `Invalid setup code.` | roll not allowed, no code, or mismatch |
| 403 | `Account is deactivated. Contact the hall office.` | an existing (not yet set up) user is inactive |
| 429 | `Too many attempts. Please wait 15 minutes.` | 10 failed attempts for this roll in 15 min |
| 422 | `<field>: <message>` | validation |

## Side effects

- Inserts a `users` row (`role=student`, `identifier` = allowed email or
  `<roll>@student.iitk.ac.in`, lower-cased, `is_active=true`, `password_set=true`,
  `must_change_password=false`) or updates the existing row's password, name and room.
- Sets `allowed_roll_numbers.setup_code = NULL` (single use), in one transaction.
- Clears rate-limit key `setup:<ROLL_NO>`; issues access + refresh tokens.

## Business rules

- The identifier is the institute email created by the hall office upload
  (`<roll>@iitk.ac.in`); students log in with it.

## Changes vs FastAPI

- Identifier/email are lower-cased on creation (login is case-insensitive for emails anyway).
- Inactive existing accounts are rejected with 403 instead of being re-enabled silently.
- Setup-code attempts are rate limited (see errors).
