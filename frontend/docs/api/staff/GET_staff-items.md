# GET /api/staff/items

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/items/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::list_all_items`

Every extras item (active and inactive), newest first.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

No parameters.

## Response

`200` list of ItemResponse ordered by `created_at` descending.

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- May run the recurring-items job first (throttled to once per 15 minutes).

## Business rules

- None.

## Changes vs FastAPI

- Lazy recurring-items maintenance (see Side effects).
