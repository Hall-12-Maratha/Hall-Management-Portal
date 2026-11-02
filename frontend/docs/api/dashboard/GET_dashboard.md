# GET /api/dashboard

**Group:** dashboard
**Implementation:** `frontend/src/app/api/dashboard/route.ts`
**FastAPI origin:** none (new; combines `/dashboard/summary`, `/menu/weekly` and `/notices`)

Everything the student dashboard shows, in one request: wastage summary,
public notices, the caller's personal notices and the weekly menu. Notices
are always fresh. The menu is versioned so the client can keep it in the
browser for weeks and still pick up edits on the next visit.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student

## Request

- Query params: `menu_version` (string, optional, at most 64 chars): the
  `menu_version` the client received last time. When it still matches, the
  response carries `menu: null`.

## Response

`200`:

```json
{
  "summary": { "avg_bdmr": 13.0, "plain_wastage": 3.0, "plate_wastage": 2.0,
               "wastage_date": "2026-10-13", "last_updated": "2026-10-13T09:15:00.000Z" },
  "notices": [ { "...NoticeResponse" } ],
  "personal_notices": [
    { "id": 4, "title": "October mess bill", "notice": "INR 3450, pay by 10 Nov.",
      "created_at": "2026-11-01T05:00:00.000Z" }
  ],
  "menu_version": "21:1791833205786",
  "menu": { "slots": [ { "...MenuSlot" } ] },
  "generated_at": "2026-10-13T10:00:00.000Z"
}
```

`summary`, `menu.slots` and `notices` have exactly the shapes documented for
`GET /api/dashboard/summary`, `GET /api/menu/weekly` and `GET /api/notices`.
`personal_notices` is newest first and contains only rows addressed to the
caller. `menu_version` is opaque (`<slot count>:<latest updated_at ms>`).

## Errors

| Status | `detail` | When |
|---|---|---|
| 422 | `menu_version: ...` | longer than 64 chars |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- May send the closing-soon push reminder first (throttled to once per 5
  minutes; skipped entirely when VAPID keys are not configured).

## Business rules

- Same rules as the underlying endpoints (shared read models in
  `lib/server/dashboard.ts`).
- The dashboard page stores `{menu_version, slots}` in `localStorage` for 30
  days and sends the version back; notices are never cached client-side.

## Changes vs FastAPI

- New endpoint, added to cut per-visit request count on the Vercel Hobby plan.
- `personal_notices`, `menu_version` and conditional `menu` added with the
  student-specific features.
