-- One-off script for a database that was created by the FastAPI/Alembic
-- version of this project (all other tables already exist there).
--
-- Run it once in the Supabase SQL editor (or: psql "$DATABASE_URL" -f this-file).
-- It is idempotent.
--
-- Do NOT run `npm run db:migrate` against such a database: drizzle/0000_initial.sql
-- recreates every table and would fail on the existing ones. `db:migrate` is for
-- fresh databases only. For future schema changes, generate a migration with
-- `npm run db:generate`, review the SQL, and apply it here the same way.

CREATE TABLE IF NOT EXISTS "rate_limits" (
    "key" varchar(255) PRIMARY KEY NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "window_start" timestamp with time zone DEFAULT now() NOT NULL
);
