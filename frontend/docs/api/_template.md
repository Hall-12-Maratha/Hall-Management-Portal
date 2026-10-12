# METHOD /api/path

**Group:** group name
**Implementation:** `frontend/src/app/api/.../route.ts`
**FastAPI origin:** `backend/app/routers/<file>.py::<function>`

## Auth

- Header: `Authorization: Bearer <access_token>` | none | cookie `refresh_token` | `Authorization: Bearer <CRON_SECRET>`
- Roles: list of roles, or "any authenticated user"

## Request

- Path params: `name` (type, rules)
- Query params: `name` (type, required?, rules)
- Body (`application/json` | `multipart/form-data`):

| Field | Type | Required | Validation |
|---|---|---|---|

## Response

`200` with shape:

```json
{}
```

## Errors

| Status | `detail` | When |
|---|---|---|

## Side effects

- Database writes, cookies set or cleared, emails sent, rate-limit counters touched.

## Business rules

- Behaviour that is not obvious from the request/response contract.

## Changes vs FastAPI

- None, or the list of intentional differences.
