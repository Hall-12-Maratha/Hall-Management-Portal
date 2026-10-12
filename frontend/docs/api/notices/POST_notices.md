# POST /api/notices

**Group:** notices
**Implementation:** `frontend/src/app/api/notices/route.ts`
**FastAPI origin:** `backend/app/routers/notices.py::create_notice`

Post a notice.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office, mess_staff (checked after authentication)

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| title | string | yes | 1..255 |
| description | string | yes | min 1 |
| link | string \| null | no | at most 500 characters (not validated as a URL) |

## Response

`201` NoticeResponse (see `GET_notices.md`).

## Errors

| Status | `detail` | When |
|---|---|---|
| 403 | `You do not have permission to post notices.` | student or mess_worker |
| 422 | `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive |

## Side effects

- Inserts a `notices` row with `created_by` = caller.

## Business rules

- None.

## Changes vs FastAPI

- None.
