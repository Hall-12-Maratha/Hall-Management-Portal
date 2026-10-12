# GET /api/dashboard/summary

**Group:** dashboard
**Implementation:** `frontend/src/app/api/dashboard/summary/route.ts`
**FastAPI origin:** `backend/app/routers/dashboard.py::get_dashboard_summary`

Wastage summary shown on the student dashboard.

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: student

## Request

No parameters.

## Response

`200`:

```json
{ "avg_bdmr": 13.0, "plain_wastage": 3.0, "plate_wastage": 2.0,
  "wastage_date": "2026-10-13", "last_updated": "2026-10-13T09:15:00.000Z" }
```

All fields are `null` when there is no wastage entry dated today or earlier (India time).

## Errors

| Status | `detail` | When |
|---|---|---|
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- None.

## Business rules

- `avg_bdmr` = mean of `bdmr` over the entries dated within the last 7 India
  calendar days (today and six days before), rounded to 2 decimals; `null` if none.
- `plain_wastage`, `plate_wastage`, `wastage_date` come from the latest entry
  dated today or earlier; `last_updated` is the newest `entered_at` among those.

## Changes vs FastAPI

- None.
