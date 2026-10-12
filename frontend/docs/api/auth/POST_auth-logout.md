# POST /api/auth/logout

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/logout/route.ts`
**FastAPI origin:** `backend/app/routers/auth.py::logout`

Clear the refresh cookie. The client discards its in-memory access token.

## Auth

- Header: none required
- Roles: public

## Request

No body.

## Response

`200` with `Set-Cookie: refresh_token=; Max-Age=0; Path=/; HttpOnly; SameSite=lax[; Secure]`:

```json
{ "message": "Logged out." }
```

## Errors

None.

## Side effects

- Clears the cookie only; the refresh token itself is stateless and simply expires.

## Business rules

- None.

## Changes vs FastAPI

- None.
