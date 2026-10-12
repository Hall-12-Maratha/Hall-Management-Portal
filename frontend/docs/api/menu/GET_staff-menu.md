# GET /api/staff/menu

**Group:** menu
**Implementation:** `frontend/src/app/api/staff/menu/route.ts`
**FastAPI origin:** `backend/app/routers/menu.py::get_staff_menu`

Weekly menu for the staff editor. Same data as `GET /api/menu/weekly`.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

No parameters.

## Response

`200` `{ "slots": [MenuSlot...] }` (see `GET_menu-weekly.md`).

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
