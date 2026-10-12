# POST /api/auth/setup/verify

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/setup/verify/route.ts`
**FastAPI origin:** `backend/app/routers/auth.py::setup_verify`

Step 1 of student account setup: check a roll number + setup code and return the
pre-filled profile so the signup form can show it.

## Auth

- Header: none
- Roles: public

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| roll_no | string | yes | trimmed before lookup |
| setup_code | string | yes | exactly 8 characters, case-sensitive |

## Response

`200`:

```json
{ "name": "Test Student", "email": "230001@iitk.ac.in", "room_no": "A-101",
  "message": "Setup code verified. Set your password." }
```

`name`, `email`, `room_no` may be `null` when the allowed-roll row has no value.

## Errors

| Status | `detail` | When |
|---|---|---|
| 409 | `An account with this roll number is already registered. Please log in.` | a student user with this roll_no already has `password_set` |
| 404 | `Roll number not found. Contact the hall office.` | no `allowed_roll_numbers` row |
| 400 | `Invalid setup code. Please check the code sent to your email.` | no code on the row or mismatch |
| 429 | `Too many attempts. Please wait 15 minutes.` | 10 failed attempts for this roll in 15 min |
| 422 | `<field>: <message>` | validation |

## Side effects

- Records a hit on rate-limit key `setup:<ROLL_NO>` on a 404 or 400.

## Business rules

- Verification does not consume the setup code; `setup/complete` does.
- A student row that exists but has `password_set = false` passes this check.

## Changes vs FastAPI

- New brute-force protection: 10 wrong codes per roll number per 15 minutes -> 429.
