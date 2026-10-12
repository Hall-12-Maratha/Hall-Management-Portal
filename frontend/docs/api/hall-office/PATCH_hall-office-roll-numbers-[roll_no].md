# PATCH /api/hall-office/roll-numbers/{roll_no}

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/roll-numbers/[roll_no]/route.ts`
**FastAPI origin:** none (new)

Restrict or restore a student's login without removing them from the roll list.
A restricted student sees `Account is deactivated. Contact the hall office.`
on login, and any existing session stops working on its next request.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

- Path params: `roll_no` (string, exact match)
- Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| is_active | boolean | yes | `false` restricts, `true` restores |

## Response

`200`:

```json
{ "message": "Student access restricted." }
```

or `{ "message": "Student access restored." }`.

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Roll number not found.` | unknown roll |
| 404 | `This student has not set up an account yet.` | no student account linked by roll or email |
| 422 | `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Updates `users.is_active` for the student matched by `roll_no` or the roll's email.

## Business rules

- Re-uploading the roll CSV re-activates every student in the new file, so
  restrictions must be re-applied after a bulk replace.
- `GET /api/hall-office/roll-numbers` reports the state as `account_status`
  (`not_registered` | `active` | `restricted`).

## Changes vs FastAPI

- New endpoint.
