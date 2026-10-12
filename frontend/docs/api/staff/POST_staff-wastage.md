# POST /api/staff/wastage

**Group:** staff
**Implementation:** `frontend/src/app/api/staff/wastage/route.ts`
**FastAPI origin:** `backend/app/routers/staff.py::upsert_wastage`

Enter or edit today's wastage figures (India date).

## Auth

- Header: `Authorization: Bearer <access_token>`
- Roles: mess_staff

## Request

Body (`application/json`):

| Field | Type | Required | Validation |
|---|---|---|---|
| date | string | yes | YYYY-MM-DD; must equal today in India |
| bdmr | number | yes | >= 0, finite (INR) |
| plain_wastage | number | yes | >= 0, finite (kg) |
| plate_wastage | number | yes | >= 0, finite (kg) |

## Response

`200` WastageResponse (create or update):

```json
{ "id": 4, "date": "2026-10-13", "bdmr": 13, "plain_wastage": 3, "plate_wastage": 2,
  "entered_by": 2, "entered_at": "2026-10-13T09:15:00.000Z" }
```

## Errors

| Status | `detail` | When |
|---|---|---|
| 400 | `Wastage can only be entered or edited for today's date in India time.` | date is not today (IST) |
| 422 | `<field>: <message>` | validation |
| 401 / 403 | guard messages | missing token, inactive, wrong role |

## Side effects

- Inserts, or updates the existing row for the date (`entered_by`, `entered_at` refreshed).

## Business rules

- One row per date (`wastage_logs.date` is unique).

## Changes vs FastAPI

- None.
