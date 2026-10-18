# DELETE /api/me/push-subscriptions

**Group:** me
**Implementation:** `frontend/src/app/api/me/push-subscriptions/route.ts`
**FastAPI origin:** none (new)

Forget one of the caller's push endpoints (the browser unsubscribes locally
first, then calls this).

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: any authenticated user

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| endpoint | string | yes | https URL, at most 1000 chars |

## Response

`200`:

```json
{ "message": "Unsubscribed from notifications." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 422 | `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive |

## Side effects

- Deletes the `push_subscriptions` row with this endpoint if it belongs to the caller.

## Business rules

- Succeeds even when no such row exists.

## Changes vs FastAPI

- New endpoint.
