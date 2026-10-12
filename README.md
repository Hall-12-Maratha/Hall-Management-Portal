# Hall 12 - Marathas Portal

Hall Management Portal for IIT Kanpur Hall of Residence XII (Marathas). Students browse and book paid food extras, mess workers mark them served (QR scanning or a manual queue), and mess staff manage extras, the weekly menu, daily wastage figures, notices and CSV reports. The hall office onboards students in bulk and manages staff accounts.

The app is a single **Next.js full-stack project** in [`frontend/`](frontend/): the UI and the API (route handlers under `/api`) deploy together on Vercel and talk to a Supabase Postgres database.

> The previous Next.js + FastAPI version is preserved on the `next+fastapi-version` branch. The `backend/` folder on `main` is that legacy Python service, kept temporarily for reference; it is no longer deployed or required.

## Tech Stack

| Layer | Technology |
|---|---|
| App | Next.js 16 (App Router, route handlers), React 19, TypeScript, Tailwind CSS 4 |
| Database | PostgreSQL (Supabase, transaction pooler) via Drizzle ORM + postgres.js |
| Auth | JWT (HS256, `jose`) access tokens in memory + httpOnly refresh cookie, bcrypt (`bcryptjs`) |
| Validation | zod |
| Email | nodemailer (SMTP STARTTLS; console fallback in dev) |
| QR | `qrcode` for generation, `html5-qrcode` for scanning (behind feature flags) |
| Jobs | Vercel Cron (daily) + lazy throttled maintenance inside read endpoints |
| Hosting | Vercel Hobby (root directory `frontend`) |

## Architecture

```mermaid
flowchart TD
    Student([Student]) --> UI
    MessStaff([Mess Staff]) --> UI
    MessWorker([Mess Worker]) --> UI
    HallOffice([Hall Office]) --> UI

    subgraph Vercel [Next.js app - frontend/]
        UI[App Router pages\nclient components]
        API[Route handlers /api/*\nzod validation, JWT guards]
        Jobs[Maintenance jobs\nrecurring items, missed bookings]
        Cron[/api/cron/daily\nVercel Cron, CRON_SECRET/]
    end

    UI --> |same-origin fetch\nBearer access token + refresh cookie| API
    API --> |throttled via rate_limits| Jobs
    Cron --> Jobs
    API <--> |Drizzle ORM| DB[(Supabase Postgres)]
    Jobs <--> DB
    API --> |OTP mail| SMTP[SMTP provider]
```

Every former FastAPI endpoint exists at the same path with an `/api` prefix. The per-endpoint reference lives in [`frontend/docs/api/`](frontend/docs/api/README.md).

## Quick Start

### Prerequisites

- Node.js 20+ (22 recommended)
- A Postgres database (Supabase project, or any local Postgres)

### 1. Install and configure

```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in DATABASE_URL (Supabase pooler URL, port 6543), JWT_SECRET, CRON_SECRET.
# Leave SMTP_HOST/SMTP_USER empty to print OTP emails to the console.
```

### 2. Database

**Existing Supabase database (migrated from the FastAPI version):** the tables already exist. Run the one-off script in the Supabase SQL editor to add the only new table:

```
frontend/drizzle/manual/add_rate_limits_to_existing_db.sql
```

**Fresh database:**

```bash
npm run db:migrate   # applies frontend/drizzle/*.sql
npm run db:seed      # creates the hall_office admin (admin@hall12 / SEED_ADMIN_PASSWORD or Hall12kaAdmin!)
```

### 3. Run

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # next typegen + tsc
npm run lint
npm test             # vitest (auth, schemas, csv, dates)
npm run build
```

### 4. First login

Use the seeded hall_office admin (`admin@hall12`). You must change the password on first login. Then upload the student roll CSV, download setup codes, and create mess staff / worker accounts.

## Deploying to Vercel (Hobby)

1. Import the repository, set **Root Directory** to `frontend`.
2. Add every variable from `frontend/.env.example` in Project Settings -> Environment Variables (`COOKIE_SECURE=true`, leave `ENABLE_IN_PROCESS_SCHEDULER` unset, generate a random `CRON_SECRET`).
3. `frontend/vercel.json` registers the daily cron (`/api/cron/daily`, 22:00 IST). Vercel sends `CRON_SECRET` automatically. Hobby allows only daily schedules, so the same jobs also run lazily from the endpoints that depend on them.
4. Keep the Supabase project awake (free projects pause after a week of inactivity).

Invocation budget: a hard page load costs one API call (`/api/auth/refresh` returns the user), there is no keep-alive ping, and in-app navigation is client-side, so ~700 daily users stay well inside the Hobby limits.

## Roles

| Role | Access |
|---|---|
| `hall_office` | Upload roll numbers CSV, download setup codes, create/deactivate staff accounts, post notices |
| `mess_staff` | Manage extras items, view/serve/cancel bookings, approve cancellation requests, edit weekly menu, enter wastage, post notices, download CSV reports |
| `mess_worker` | QR scanner (when enabled), today's booking queue |
| `student` | Dashboard (wastage, menu, notices), browse/book extras, booking history, change password |

## Project Structure

```
HMP/
├── frontend/                      # the whole application
│   ├── src/app/                   # pages (client components) + api/**/route.ts handlers
│   ├── src/lib/server/            # server-only code
│   │   ├── db/schema.ts           # Drizzle schema (1:1 with the Postgres tables)
│   │   ├── db/client.ts           # postgres.js pool (serverless-safe singleton)
│   │   ├── auth/                  # jwt, password hashing, cookies, guards, session
│   │   ├── schemas/               # zod request schemas (former Pydantic models)
│   │   ├── jobs/                  # recurring items, missed bookings, maintenance runner
│   │   ├── http.ts                # FastAPI-style error contract, handleRoute wrapper
│   │   ├── rate-limit.ts          # Postgres-backed rate limits and job throttle
│   │   ├── email.ts, qr.ts, csv.ts, dates.ts, serializers.ts
│   │   └── __tests__/             # vitest unit tests
│   ├── src/lib/                   # api client, auth context, utils (client side)
│   ├── src/instrumentation.ts     # optional in-process hourly scheduler (self-hosting)
│   ├── drizzle/                   # SQL migrations + manual script for the existing DB
│   ├── scripts/seed.ts            # bootstrap admin account
│   ├── docs/api/                  # one Markdown file per endpoint
│   └── vercel.json                # cron schedule
├── backend/                       # legacy FastAPI service (reference only, see branch next+fastapi-version)
├── README.md
└── SECURITY.md
```

## Notes

- **Timestamps** are stored as naive UTC and returned as ISO strings with `Z`; business dates (today, meal cutoffs, wastage) use India time.
- **Rate limiting** lives in the `rate_limits` table (OTP 3/15 min, login 5/15 min, setup codes 10/15 min), so it works across serverless instances.
- **QR flow** is disabled by default (`QR_SCANNING_ENABLED` / `NEXT_PUBLIC_QR_SCANNING_ENABLED`); workers use the manual queue.
- **Email in dev:** OTPs are printed to the server console unless `SMTP_HOST` and `SMTP_USER` are set.
