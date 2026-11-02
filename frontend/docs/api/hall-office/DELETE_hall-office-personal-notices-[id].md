# DELETE /api/hall-office/personal-notices/{id}

**Group:** hall-office
**Implementation:** `frontend/src/app/api/hall-office/personal-notices/[id]/route.ts`
**FastAPI origin:** none (new)

Remove one personal notice; the student stops seeing it immediately.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: hall_office

## Request

- Path params: `id` (integer)

## Response

`200`:

```json
{ "message": "Personal notice deleted." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 404 | `Personal notice not found.` | no such id |
| 422 | `id: must be an integer.` | bad path param |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Deletes the `personal_notices` row. No push is sent.

## Business rules

- None.

## Changes vs FastAPI

- New endpoint.
