-- Personal notices, Web Push subscriptions and the closing-soon reminder flag.
--
-- Run once in the Supabase SQL editor (or: psql "$DATABASE_URL" -f this-file)
-- on a database that already exists. Idempotent. Equivalent to
-- drizzle/0001_student_features.sql, which `npm run db:migrate` applies on a
-- fresh database.

CREATE TABLE IF NOT EXISTS "personal_notices" (
    "id" serial PRIMARY KEY NOT NULL,
    "student_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "title" varchar(255) NOT NULL,
    "notice" text NOT NULL,
    "created_by" integer NOT NULL REFERENCES "public"."users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ix_personal_notices_student_id" ON "personal_notices" USING btree ("student_id");

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "endpoint" varchar(1000) NOT NULL,
    "p256dh" varchar(255) NOT NULL,
    "auth" varchar(255) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "ix_push_subscriptions_endpoint" ON "push_subscriptions" USING btree ("endpoint");
CREATE INDEX IF NOT EXISTS "ix_push_subscriptions_user_id" ON "push_subscriptions" USING btree ("user_id");

ALTER TABLE "extras_items" ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp;

-- Same lock-out from the Supabase Data API as harden_supabase_data_api.sql.
ALTER TABLE public.personal_notices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.personal_notices, public.push_subscriptions FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
