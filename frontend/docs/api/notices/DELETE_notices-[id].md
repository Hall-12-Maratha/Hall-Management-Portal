# DELETE /api/notices/{notice_id}

**Group:** notices
**Implementation:** `frontend/src/app/api/notices/[id]/route.ts`
**FastAPI origin:** `backend/app/routers/notices.py::delete_notice`

Delete a notice (any hall_office or mess_staff user, not only the author).

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office, mess_staff (checked after authentication)

## Request

- Path params: `notice_id` (integer)

## Response

`200`:

```json
{ "message": "Notice deleted." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 403 | `You do not have permission to delete notices.` | student or mess_worker |
| 404 | `Notice not found.` | unknown id |
| 422 | `notice_id: must be an integer.` | bad path param |
| 401 / 403 | guard messages | missing token, inactive |

## Side effects

- Hard-deletes the row.

## Business rules

- None.

## Changes vs FastAPI

- None.
