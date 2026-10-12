# GET /api/auth/me

**Group:** auth
**Implementation:** `frontend/src/app/api/auth/me/route.ts`
**FastAPI origin:** `backend/app/routers/auth.py::get_me`

Profile of the current user.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: any authenticated user

## Request

No parameters.

## Response

`200` UserBrief:

```json
{ "id": 1, "identifier": "230001@iitk.ac.in", "name": "Test Student", "role": "student",
  "email": "230001@iitk.ac.in", "roll_no": "230001", "room_no": "A-101" }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 | `Missing or invalid authorization header.` / `Invalid or expired token.` / `Invalid token type.` / `Token missing subject.` / `User not found.` | guard |
| 403 | `Account is deactivated.` | inactive account |

## Side effects

- None.

## Business rules

- The client normally does not need this call: `POST /api/auth/refresh` already returns `user`.

## Changes vs FastAPI

- None.
