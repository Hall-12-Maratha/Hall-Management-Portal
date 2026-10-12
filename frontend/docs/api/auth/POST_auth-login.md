# POST /api/auth/login

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/login/route.ts`
**FastAPI origin:** `backend/app/routers/auth.py::login`

Password login for every role.

## Auth

- Header: none
- Roles: public

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| identifier | string | yes | min 1; students use their email, staff their ID (`MS-001`) |
| password | string | yes | min 1 |

## Response

`200` LoginResponse + `Set-Cookie: refresh_token=...` for a normal account:

```json
{ "access_token": "<jwt>", "token_type": "bearer", "user": { "...UserBrief" } }
```

`200` (no cookie) when the account must change its temporary password:

```json
{ "must_change_password": true, "change_token": "<jwt, 10 min>",
  "message": "You must change your password before continuing." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 429 | `Too many login attempts. Account locked for 15 minutes.` | 5 failures for this identifier in 15 min |
| 401 | `Invalid credentials.` | unknown identifier or wrong password (counted as a failure) |
| 403 | `Account is deactivated. Contact the hall office.` | `is_active` false |
| 400 | `Account setup is incomplete. Please complete signup first.` | `password_set` false |
| 422 | `<field>: <message>` | validation |

## Side effects

- Failure: records a hit on `login:<identifier>` (emails lower-cased).
- Success: clears that key; issues tokens (unless `must_change_password`).

## Business rules

- Identifiers containing `@` are matched case-insensitively; staff IDs exactly.

## Changes vs FastAPI

- Email identifiers are case-insensitive.
- Rate limit is stored in Postgres instead of process memory.
