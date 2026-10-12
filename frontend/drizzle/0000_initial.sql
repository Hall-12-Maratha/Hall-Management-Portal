CREATE TYPE "public"."bookingstatus" AS ENUM('booked', 'served', 'missed', 'cancelled', 'cancel_requested');--> statement-breakpoint
CREATE TYPE "public"."mealtype" AS ENUM('breakfast', 'lunch', 'dinner');--> statement-breakpoint
CREATE TYPE "public"."userrole" AS ENUM('student', 'mess_staff', 'mess_worker', 'hall_office');--> statement-breakpoint
CREATE TABLE "allowed_roll_numbers" (
	"roll_no" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"room_number" varchar(50),
	"uploaded_by" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"setup_code" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "extras_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"qty" integer NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"status" "bookingstatus" NOT NULL,
	"qr_token" varchar(64) NOT NULL,
	"qr_used_at" timestamp,
	"served_by" integer,
	"booked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extras_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	"meal_type" "mealtype" DEFAULT 'lunch' NOT NULL,
	"opens_at" timestamp NOT NULL,
	"closes_at" timestamp NOT NULL,
	"prep_time_mins" integer NOT NULL,
	"is_recurring" boolean NOT NULL,
	"recurring_weekday" integer,
	"is_active" boolean NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"link" varchar(500),
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"email" varchar(255),
	"password_hash" varchar(255) NOT NULL,
	"role" "userrole" NOT NULL,
	"name" varchar(255) NOT NULL,
	"room_no" varchar(50),
	"roll_no" varchar(50),
	"is_active" boolean NOT NULL,
	"otp_hash" varchar(255),
	"otp_expires_at" timestamp,
	"otp_attempts" integer NOT NULL,
	"password_set" boolean NOT NULL,
	"must_change_password" boolean NOT NULL,
	"failed_login_attempts" integer NOT NULL,
	"locked_until" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_identifier_key" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "wastage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"bdmr" double precision NOT NULL,
	"plain_wastage" double precision NOT NULL,
	"plate_wastage" double precision NOT NULL,
	"entered_by" integer NOT NULL,
	"entered_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wastage_logs_date_key" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "weekly_menu" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_of_week" integer NOT NULL,
	"meal_type" "mealtype" NOT NULL,
	"description" text NOT NULL,
	"updated_by" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_day_meal" UNIQUE("day_of_week","meal_type")
);
--> statement-breakpoint
ALTER TABLE "allowed_roll_numbers" ADD CONSTRAINT "allowed_roll_numbers_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extras_bookings" ADD CONSTRAINT "extras_bookings_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extras_bookings" ADD CONSTRAINT "extras_bookings_item_id_extras_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."extras_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extras_bookings" ADD CONSTRAINT "extras_bookings_served_by_users_id_fk" FOREIGN KEY ("served_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extras_items" ADD CONSTRAINT "extras_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wastage_logs" ADD CONSTRAINT "wastage_logs_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_menu" ADD CONSTRAINT "weekly_menu_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ix_extras_bookings_qr_token" ON "extras_bookings" USING btree ("qr_token");