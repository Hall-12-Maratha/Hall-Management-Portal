# POST /api/auth/refresh

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/refresh/route.ts`
**FastAPI origin:** `backend/app/routers/auth.py::refresh_token`

Mint a new access token from the httpOnly refresh cookie. Used on every page
load to restore the session and whenever an access token expires.

## Auth

- Cookie: `refresh_token` (sent automatically, same origin)
- Roles: any active user

## Request

No body.

## Response

`200`:

```json
{ "access_token": "<jwt>", "token_type": "bearer", "user": { "...UserBrief" } }
```

The refresh cookie is not rotated or re-set.

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 | `No refresh token.` | cookie missing |
| 401 | `Invalid or expired refresh token.` | bad signature, expired, wrong `type` |
| 401 | `User not found or deactivated.` | subject missing or inactive |

## Side effects

- None.

## Business rules

- Refresh tokens are stateless (not stored), valid for `REFRESH_TOKEN_EXPIRE_DAYS`.

## Changes vs FastAPI

- The response includes `user` so session restore is one request instead of
  refresh + `/auth/me` (halves cold-load invocations on Vercel).
