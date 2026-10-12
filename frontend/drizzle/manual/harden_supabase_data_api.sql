-- Lock the Supabase Data API (PostgREST) out of the application tables.
--
-- The app connects as the `postgres` role from server code only (it owns the
-- tables and has BYPASSRLS), so nothing here affects it. Supabase additionally
-- exposes every `public` table through its REST API to the `anon` and
-- `authenticated` roles, which this project never uses. Enabling RLS with no
-- policies and revoking the grants makes that API return nothing even if the
-- anon key leaks.
--
-- Run once per Supabase project (SQL editor or psql). Idempotent.

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_roll_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras_bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_menu          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wastage_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits          ENABLE ROW LEVEL SECURITY;

-- Legacy Alembic bookkeeping table, present only on databases created by the FastAPI version.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alembic_version') THEN
    EXECUTE 'ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Tables created later (e.g. by drizzle-kit) must not be granted to those roles either.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
