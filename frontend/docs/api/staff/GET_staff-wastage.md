# GET /api/staff/wastage

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/wastage/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::list_wastage`

Every wastage entry, newest date first.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

No parameters.

## Response

`200` list of WastageResponse ordered by `date` descending.

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- None.

## Business rules

- None.

## Changes vs FastAPI

- None.
