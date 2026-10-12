# HMP API reference (Next.js route handlers)

Every endpoint of the former FastAPI backend now lives in this Next.js app as a
route handler under `src/app/api/**/route.ts`, reachable at the same path with
an `/api` prefix. One Markdown file per endpoint lives in the folders below.
`_template.md` is the layout each file follows.

## Conventions

- **Base path:** `/api` (same origin as the pages, so no CORS and no cross-site cookie).
- **Auth:** `Authorization: Bearer <access_token>` on every protected call. The
  access token is short-lived (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 15) and is
  kept in memory by the client. The refresh token is an httpOnly cookie named
  `refresh_token` (`path=/`, `SameSite=lax`, `Secure` in production, 7 days).
- **Errors:** always JSON `{"detail": "<message>"}` with the HTTP status.
  Validation failures are `422` with `detail` = `"<field>: <message>"` (the first
  issue) plus `errors: [{field, message}]` for every issue. Unhandled errors are
  `500 {"detail": "Internal server error."}`.
- **Guards:** missing/invalid bearer -> `401` (`Missing or invalid authorization
  header.`, `Invalid or expired token.`, `Invalid token type.`, `Token missing
  subject.`, `User not found.`); deactivated account -> `403 Account is
  deactivated.`; wrong role -> `403 Access denied. Required role(s): a, b.`
- **Dates and times:** calendar dates are `"YYYY-MM-DD"`; timestamps are ISO-8601
  UTC strings ending in `Z`. "Today", meal cutoffs and wastage dates use India
  Standard Time.
- **Money:** `price`, `total_price`, `running_total` are JSON numbers (two
  decimals in the database).
- **Rate limits** live in the `rate_limits` table (15-minute fixed window), so
  they work across serverless instances: OTP requests 3/email, failed logins
  5/identifier, wrong setup codes 10/roll number.
- **Background jobs** (recurring item clones, missed-booking marking) have no
  scheduler: they run lazily from the reads that depend on them (`GET /api/items`,
  `GET /api/staff/items`, `GET /api/bookings/me`, `GET /api/staff/bookings`,
  `GET /api/worker/bookings/today`), throttled through `rate_limits` (`job:*` keys)
  so each runs at most once per interval across all instances. Mess staff can
  force the missed check with `POST /api/staff/bookings/trigger-missed`.

## Endpoints

### auth (`docs/api/auth/`)

| Method | Path | Roles | Doc |
|---|---|---|---|
| POST | /api/auth/setup/verify | public | [POST_auth-setup-verify.md](auth/POST_auth-setup-verify.md) |
| POST | /api/auth/setup/complete | public | [POST_auth-setup-complete.md](auth/POST_auth-setup-complete.md) |
| POST | /api/auth/forgot-password/request-otp | public | [POST_auth-forgot-password-request-otp.md](auth/POST_auth-forgot-password-request-otp.md) |
| POST | /api/auth/forgot-password/verify-otp | public | [POST_auth-forgot-password-verify-otp.md](auth/POST_auth-forgot-password-verify-otp.md) |
| POST | /api/auth/forgot-password/reset-password | public | [POST_auth-forgot-password-reset-password.md](auth/POST_auth-forgot-password-reset-password.md) |
| POST | /api/auth/login | public | [POST_auth-login.md](auth/POST_auth-login.md) |
| POST | /api/auth/change-password | change_token | [POST_auth-change-password.md](auth/POST_auth-change-password.md) |
| POST | /api/auth/change-password/authenticated | any user | [POST_auth-change-password-authenticated.md](auth/POST_auth-change-password-authenticated.md) |
| GET | /api/auth/me | any user | [GET_auth-me.md](auth/GET_auth-me.md) |
| POST | /api/auth/refresh | refresh cookie | [POST_auth-refresh.md](auth/POST_auth-refresh.md) |
| POST | /api/auth/logout | public | [POST_auth-logout.md](auth/POST_auth-logout.md) |

### dashboard (`docs/api/dashboard/`)

| Method | Path | Roles | Doc |
|---|---|---|---|
| GET | /api/dashboard/summary | student | [GET_dashboard-summary.md](dashboard/GET_dashboard-summary.md) |

### menu (`docs/api/menu/`)

| Method | Path | Roles | Doc |
|---|---|---|---|
| GET | /api/menu/weekly | student, mess_staff | [GET_menu-weekly.md](menu/GET_menu-weekly.md) |
| GET | /api/staff/menu | mess_staff | [GET_staff-menu.md](menu/GET_staff-menu.md) |
| PUT | /api/staff/menu/{day}/{meal} | mess_staff | [PUT_staff-menu-[day]-[meal].md](menu/PUT_staff-menu-[day]-[meal].md) |

### items (`docs/api/items/`)

| Method | Path | Roles | Doc |
|---|---|---|---|
| GET | /api/items | student | [GET_items.md](items/GET_items.md) |

### bookings (`docs/api/bookings/`)

| Method | Path | Roles | Doc |
|---|---|---|---|
| POST | /api/bookings | student | [POST_bookings.md](bookings/POST_bookings.md) |
| GET | /api/bookings/me | student | [GET_bookings-me.md](bookings/GET_bookings-me.md) |
| GET | /api/bookings/me/export | student | [GET_bookings-me-export.md](bookings/GET_bookings-me-export.md) |
| GET | /api/bookings/{id}/qr | student | [GET_bookings-[id]-qr.md](bookings/GET_bookings-[id]-qr.md) |
| PUT | /api/bookings/{id}?qty= | student | [PUT_bookings-[id].md](bookings/PUT_bookings-[id].md) |
| DELETE | /api/bookings/{id} | student | [DELETE_bookings-[id].md](bookings/DELETE_bookings-[id].md) |
| POST | /api/bookings/{id}/request-cancel | student | [POST_bookings-[id]-request-cancel.md](bookings/POST_bookings-[id]-request-cancel.md) |

### staff (`docs/api/staff/`)

| Method | Path | Roles | Doc |
|---|---|---|---|
| POST | /api/staff/items | mess_staff | [POST_staff-items.md](staff/POST_staff-items.md) |
| GET | /api/staff/items | mess_staff | [GET_staff-items.md](staff/GET_staff-items.md) |
| PUT | /api/staff/items/{id} | mess_staff | [PUT_staff-items-[id].md](staff/PUT_staff-items-[id].md) |
| DELETE | /api/staff/items/{id} | mess_staff | [DELETE_staff-items-[id].md](staff/DELETE_staff-items-[id].md) |
| POST | /api/staff/items/{id}/bookings/bulk-delete | mess_staff | [POST_staff-items-[id]-bookings-bulk-delete.md](staff/POST_staff-items-[id]-bookings-bulk-delete.md) |
| GET | /api/staff/bookings | mess_staff | [GET_staff-bookings.md](staff/GET_staff-bookings.md) |
| POST | /api/staff/bookings/trigger-missed | mess_staff | [POST_staff-bookings-trigger-missed.md](staff/POST_staff-bookings-trigger-missed.md) |
| DELETE | /api/staff/bookings/{id} | mess_staff | [DELETE_staff-bookings-[id].md](staff/DELETE_staff-bookings-[id].md) |
| POST | /api/staff/bookings/{id}/serve | mess_staff | [POST_staff-bookings-[id]-serve.md](staff/POST_staff-bookings-[id]-serve.md) |
| POST | /api/staff/bookings/{id}/cancel-request/approve | mess_staff | [POST_staff-bookings-[id]-cancel-request-approve.md](staff/POST_staff-bookings-[id]-cancel-request-approve.md) |
| POST | /api/staff/bookings/{id}/cancel-request/reject | mess_staff | [POST_staff-bookings-[id]-cancel-request-reject.md](staff/POST_staff-bookings-[id]-cancel-request-reject.md) |
| GET | /api/staff/reports/extras/export | mess_staff | [GET_staff-reports-extras-export.md](staff/GET_staff-reports-extras-export.md) |
| POST | /api/staff/wastage | mess_staff | [POST_staff-wastage.md](staff/POST_staff-wastage.md) |
| GET | /api/staff/wastage | mess_staff | [GET_staff-wastage.md](staff/GET_staff-wastage.md) |

### worker (`docs/api/worker/`)

| Method | Path | Roles | Doc |
|---|---|---|---|
| POST | /api/worker/scan | mess_worker | [POST_worker-scan.md](worker/POST_worker-scan.md) |
| GET | /api/worker/bookings/today | mess_worker | [GET_worker-bookings-today.md](worker/GET_worker-bookings-today.md) |
| POST | /api/worker/bookings/{id}/serve | mess_worker | [POST_worker-bookings-[id]-serve.md](worker/POST_worker-bookings-[id]-serve.md) |

### hall-office (`docs/api/hall-office/`)

| Method | Path | Roles | Doc |
|---|---|---|---|
| POST | /api/hall-office/roll-numbers/upload | hall_office | [POST_hall-office-roll-numbers-upload.md](hall-office/POST_hall-office-roll-numbers-upload.md) |
| GET | /api/hall-office/roll-numbers/export-setup | hall_office | [GET_hall-office-roll-numbers-export-setup.md](hall-office/GET_hall-office-roll-numbers-export-setup.md) |
| GET | /api/hall-office/roll-numbers | hall_office | [GET_hall-office-roll-numbers.md](hall-office/GET_hall-office-roll-numbers.md) |
| POST | /api/hall-office/roll-numbers | hall_office | [POST_hall-office-roll-numbers.md](hall-office/POST_hall-office-roll-numbers.md) |
| DELETE | /api/hall-office/roll-numbers/{roll_no} | hall_office | [DELETE_hall-office-roll-numbers-[roll_no].md](hall-office/DELETE_hall-office-roll-numbers-[roll_no].md) |
| POST | /api/hall-office/staff | hall_office | [POST_hall-office-staff.md](hall-office/POST_hall-office-staff.md) |
| GET | /api/hall-office/staff | hall_office | [GET_hall-office-staff.md](hall-office/GET_hall-office-staff.md) |
| PATCH | /api/hall-office/staff/{user_id} | hall_office | [PATCH_hall-office-staff-[user_id].md](hall-office/PATCH_hall-office-staff-[user_id].md) |
| DELETE | /api/hall-office/staff/{user_id} | hall_office | [DELETE_hall-office-staff-[user_id].md](hall-office/DELETE_hall-office-staff-[user_id].md) |

### notices (`docs/api/notices/`)

| Method | Path | Roles | Doc |
|---|---|---|---|
| GET | /api/notices | any user | [GET_notices.md](notices/GET_notices.md) |
| POST | /api/notices | hall_office, mess_staff | [POST_notices.md](notices/POST_notices.md) |
| DELETE | /api/notices/{id} | hall_office, mess_staff | [DELETE_notices-[id].md](notices/DELETE_notices-[id].md) |

### misc (`docs/api/misc/`)

| Method | Path | Roles | Doc |
|---|---|---|---|
| GET | /api/health | public | [GET_health.md](misc/GET_health.md) |

## Shared shapes

```json
// UserBrief
{ "id": 1, "identifier": "230001@iitk.ac.in", "name": "Test Student", "role": "student",
  "email": "230001@iitk.ac.in", "roll_no": "230001", "room_no": "A-101" }

// LoginResponse (body) + Set-Cookie: refresh_token=...; HttpOnly; Path=/; Max-Age=604800; SameSite=lax
{ "access_token": "<jwt>", "token_type": "bearer", "user": { "...UserBrief" } }

// ItemResponse
{ "id": 3, "name": "Paneer Tikka", "price": 40, "date": "2026-10-13", "meal_type": "dinner",
  "opens_at": "2026-10-11T14:00:00.000Z", "closes_at": "2026-10-13T14:00:00.000Z",
  "prep_time_mins": 2880, "is_recurring": false, "recurring_weekday": null,
  "is_active": true, "created_at": "2026-10-10T08:00:00.000Z" }

// BookingResponse
{ "id": 9, "item_id": 3, "item_name": "Paneer Tikka", "item_date": "2026-10-13",
  "meal_type": "dinner", "qty": 2, "total_price": 80, "status": "booked",
  "qr_token": "32 hex chars", "booked_at": "2026-10-12T10:00:00.000Z",
  "qr_used_at": null, "closes_at": "2026-10-13T14:00:00.000Z" }
```

Enumerations: `role` = student | mess_staff | mess_worker | hall_office;
`meal_type` = breakfast | lunch | dinner;
`status` = booked | served | missed | cancelled | cancel_requested.
