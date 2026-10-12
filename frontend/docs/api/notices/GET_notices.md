# GET /api/notices

**Group:** notices
**Implementation:** `frontend/src/app/api/notices/route.ts`
**FastAPI origin:** `backend/app/routers/notices.py::get_all_notices`

Notice board, newest first.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: any authenticated user

## Request

No parameters.

## Response

`200`:

```json
[ { "id": 3, "title": "Mess closed on Sunday", "description": "...", "link": null,
    "created_at": "2026-10-13T08:00:00.000Z", "created_by": 2 } ]
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive |

## Side effects

- None.

## Business rules

- None.

## Changes vs FastAPI

- None.
