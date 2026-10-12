# POST /api/hall-office/roll-numbers

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/roll-numbers/route.ts`
**FastAPI origin:** `backend/app/routers/hall_office.py::add_roll_number`

Add a single allowed roll with a freshly generated setup code.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| roll_no | string | yes | 3..50 chars, `[A-Za-z0-9-]`; stored upper-cased |
| name | string \| null | no | at most 255 |
| email | string \| null | no | valid email if given; ignored (institute address is used) |
| room_number | string \| null | no | at most 50 |

## Response

`200` AllowedRollResponse (see `GET_hall-office-roll-numbers.md`) with the new `setup_code`.

## Errors

| Status | `detail` | When |
|---|---|---|
| 409 | `Roll number already exists in allowed list.` | duplicate roll |
| 422 | `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Inserts the row (`email = <roll>@iitk.ac.in`, `uploaded_by` = caller) and
  reactivates a deactivated student user with the same `roll_no`, in one transaction.

## Business rules

- Status is `200`, not `201` (kept from FastAPI).

## Changes vs FastAPI

- None.
