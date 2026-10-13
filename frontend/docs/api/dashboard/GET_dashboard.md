# GET /api/dashboard

**Group:** dashboard
**Implementation:** `frontend/src/app/api/dashboard/route.ts`
**FastAPI origin:** none (new; combines `/dashboard/summary`, `/menu/weekly` and `/notices`)

Everything the student dashboard shows, in one request. The dashboard page
caches the result in the browser for an hour, so a student reopening the
installed app usually makes no request at all.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student

## Request

No parameters.

## Response

`200`:

```json
{
  "summary": { "avg_bdmr": 13.0, "plain_wastage": 3.0, "plate_wastage": 2.0,
               "wastage_date": "2026-10-13", "last_updated": "2026-10-13T09:15:00.000Z" },
  "menu": { "slots": [ { "...MenuSlot" } ] },
  "notices": [ { "...NoticeResponse" } ],
  "generated_at": "2026-10-13T10:00:00.000Z"
}
```

`summary`, `menu.slots` and `notices` have exactly the shapes documented for
`GET /api/dashboard/summary`, `GET /api/menu/weekly` and `GET /api/notices`.

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- None.

## Business rules

- Same rules as the three underlying endpoints (shared read models in
  `lib/server/dashboard.ts`).

## Changes vs FastAPI

- New endpoint, added to cut per-visit request count on the Vercel Hobby plan.
