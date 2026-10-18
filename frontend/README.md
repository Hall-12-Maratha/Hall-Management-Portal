# Hall 12 Portal - Next.js full-stack app

This directory is the complete application: App Router pages plus the API as
route handlers under `src/app/api`. See the repository [README](../README.md)
for the overview and deployment steps, and [`docs/api/`](docs/api/README.md)
for the endpoint reference.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (reads `.env.local`) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | vitest unit tests (`src/lib/server/__tests__`) |
| `npm run db:generate` | drizzle-kit: generate a migration from `src/lib/server/db/schema.ts` |
| `npm run db:migrate` | drizzle-kit: apply `drizzle/*.sql` to `DATABASE_URL` (fresh databases) |
| `npm run db:seed` | create the hall_office admin account |

## Environment

Copy `.env.example` to `.env.local`. Variables prefixed `NEXT_PUBLIC_` are inlined
into the browser bundle at build time; everything else is server-only.

## Conventions

- Route handlers are wrapped with `handleRoute` from `src/lib/server/http.ts`,
  which turns thrown `HttpError`s and zod errors into FastAPI-style
  `{"detail": "..."}` responses.
- Authentication is `requireUser(req)` / `requireRole(req, ...roles)` from
  `src/lib/server/auth/guard.ts`; never trust the role claim in the JWT alone.
- Database access goes through `getDb()` (Drizzle) or `getSql()` (raw
  postgres.js) from `src/lib/server/db/client.ts`. When writing raw SQL, cast
  parameters (`${x}::int`, `${d}::date`) so Postgres never compares them as text.
- Money columns are `numeric` strings in Drizzle; convert with `money()` from
  `src/lib/server/serializers.ts` before responding.

## Request budget (Vercel Hobby)

Every API call is a function invocation and every request counts against the
CDN quota, so:

- Never poll or auto-refresh. Fetch on user action (page open, button).
- Prefer one endpoint per screen (see `GET /api/dashboard`) over several small ones.
- Cache rarely-changing data in the browser with `src/lib/clientCache.ts`.
  The dashboard keeps the weekly menu for 30 days keyed by `menu_version` and
  sends that version back, so the server returns the menu only when it changed.
  Notices are never cached: the board must be current on every open.
- Push notifications are sent after the response with `after()` from
  `next/server`, in batches, never from the request path (`src/lib/server/push.ts`).
- Serve the logo and other static images without Next image optimisation
  (`unoptimized`), which has its own small quota.

## Local Postgres without Docker

`@electric-sql/pglite-socket` serves a wire-compatible Postgres from memory:

```bash
npx -y -p @electric-sql/pglite -p @electric-sql/pglite-socket pglite-server --port 5433 --max-connections 10
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/postgres npm run db:migrate
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/postgres npm run db:seed
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/postgres npm run dev
```
