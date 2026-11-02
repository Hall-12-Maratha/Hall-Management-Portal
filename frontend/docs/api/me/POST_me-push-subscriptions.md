# POST /api/me/push-subscriptions

**Group:** me
**Implementation:** `frontend/src/app/api/me/push-subscriptions/route.ts`
**FastAPI origin:** none (new)

Register this browser's Web Push subscription for the logged-in user. The
body is `PushSubscription.toJSON()` from the browser. Idempotent per
endpoint: re-posting the same endpoint updates its keys and owner.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: any authenticated user (broadcasts only ever target active students)

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| endpoint | string | yes | https URL, at most 1000 chars |
| expirationTime | number \| null | no | ignored |
| keys.p256dh | string | yes | 1..255 |
| keys.auth | string | yes | 1..255 |

## Response

`201`:

```json
{ "message": "Subscribed to notifications." }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 503 | `Push notifications are not enabled on this server.` | VAPID variables not set |
| 422 | `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive |

## Side effects

- Upserts a `push_subscriptions` row keyed by `endpoint` (`user_id` = caller).
- Keeps at most 10 devices per user; the oldest are deleted beyond that.

## Business rules

- The client reads its own subscription state from the browser's
  `PushManager` and never asks the server for it.
- Subscriptions are tied to the server's VAPID public key: rotating the key
  invalidates every row.

## Changes vs FastAPI

- New endpoint.
