# GET /api/hall-office/staff

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/staff/route.ts`
**FastAPI origin:** `backend/app/routers/hall_office.py::list_staff`

All mess_staff and mess_worker accounts, newest first.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

No parameters.

## Response

`200`:

```json
[ { "id": 7, "identifier": "MS-001", "name": "Staff One", "role": "mess_staff",
    "is_active": true, "created_at": "2026-10-13T08:00:00.000Z" } ]
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- None.

## Business rules

- Deactivated (retired) accounts are included with `is_active: false`.

## Changes vs FastAPI

- None.
