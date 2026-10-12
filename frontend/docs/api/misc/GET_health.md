# GET /api/health

**Group:** misc
**Implementation:** `frontend/src/app/api/health/route.ts`
**FastAPI origin:** `backend/app/main.py::health_check`

Liveness probe.

## Auth

- Header: none
- Roles: public

## Request

No parameters.

## Response

`200`:

```json
{ "status": "ok", "service": "Hall 12 Marathas Portal" }
```

## Errors

None.

## Side effects

- None (does not touch the database).

## Business rules

- The old frontend pinged this every 14 minutes to keep a Render dyno awake;
  that keep-alive was removed because Vercel functions do not sleep and every
  ping would count against the Hobby invocation quota.

## Changes vs FastAPI

- None.
