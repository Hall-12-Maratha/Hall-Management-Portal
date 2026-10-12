# POST /api/auth/setup/lookup

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/setup/lookup/route.ts`
**FastAPI origin:** none (new)

Tells the login page whether an identifier belongs to a student on the allowed
roll list who has not set a password yet, so the page can switch to the inline
setup flow instead of showing "Invalid credentials".

## Auth

- Header: none
- Roles: public

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| identifier | string | yes | 1..255; an email (matched case-insensitively) or a roll number (upper-cased) |

## Response

`200`:

```json
{ "needs_setup": true, "roll_no": "230001", "has_setup_code": true }
```

- `needs_setup` is true only when an allowed roll matches and no student with
  `password_set` exists for that roll or email.
- `has_setup_code` is false when the hall office has not generated codes yet
  (the student must contact the hall office).
- Unknown identifiers return `{ "needs_setup": false, "roll_no": null, "has_setup_code": false }`.

## Errors

| Status | `detail` | When |
|---|---|---|
| 429 | `Too many attempts. Please wait 15 minutes.` | more than 20 lookups for the same identifier in 15 min |
| 422 | `identifier: ...` | validation |

## Side effects

- Counts the request on rate-limit key `lookup:<identifier>`.

## Business rules

- Reveals only whether an identifier is on the hall's roll list and unregistered;
  the setup code is still required to proceed.

## Changes vs FastAPI

- New endpoint.
