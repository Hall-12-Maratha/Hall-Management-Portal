CREATE TABLE "personal_notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"notice" text NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" varchar(1000) NOT NULL,
	"p256dh" varchar(255) NOT NULL,
	"auth" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extras_items" ADD COLUMN "reminder_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "personal_notices" ADD CONSTRAINT "personal_notices_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_notices" ADD CONSTRAINT "personal_notices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_personal_notices_student_id" ON "personal_notices" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_push_subscriptions_endpoint" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "ix_push_subscriptions_user_id" ON "push_subscriptions" USING btree ("user_id");