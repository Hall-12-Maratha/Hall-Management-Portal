/**
 * Drizzle schema - a 1:1 mapping of the existing Supabase Postgres tables.
 *
 * Source of truth: backend/app/models/*.py and the Alembic migration chain
 * (4f5c961c425f -> 5927230d097f -> 5431c4b69dad -> 49fef594fff0 ->
 *  3ae5dc679601 -> cbd91f282d64 -> a8db691a0b26).
 *
 * Conventions:
 * - All `timestamp` columns are `timestamp without time zone` holding UTC.
 *   Drizzle reads them as UTC Dates and writes Dates as UTC.
 * - `date` columns are read/written as "YYYY-MM-DD" strings.
 * - `numeric(10,2)` columns are strings in Drizzle; serializers convert to numbers.
 * - Python-side ORM defaults (is_active, otp_attempts, ...) are NOT database
 *   defaults, so inserts set them explicitly.
 */

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums (names must match the Postgres types created by Alembic)
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("userrole", [
  "student",
  "mess_staff",
  "mess_worker",
  "hall_office",
]);

export const mealTypeEnum = pgEnum("mealtype", ["breakfast", "lunch", "dinner"]);

export const bookingStatusEnum = pgEnum("bookingstatus", [
  "booked",
  "served",
  "missed",
  "cancelled",
  "cancel_requested",
]);

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type MealType = (typeof mealTypeEnum.enumValues)[number];
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];

export const USER_ROLES = userRoleEnum.enumValues;
export const MEAL_TYPES = mealTypeEnum.enumValues;
export const BOOKING_STATUSES = bookingStatusEnum.enumValues;

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    /** Students: email. Staff: generated ID such as MS-001 / MW-001. */
    identifier: varchar("identifier", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    roomNo: varchar("room_no", { length: 50 }),
    rollNo: varchar("roll_no", { length: 50 }),
    isActive: boolean("is_active").notNull(),

    otpHash: varchar("otp_hash", { length: 255 }),
    otpExpiresAt: timestamp("otp_expires_at", { mode: "date" }),
    otpAttempts: integer("otp_attempts").notNull(),

    passwordSet: boolean("password_set").notNull(),
    mustChangePassword: boolean("must_change_password").notNull(),

    failedLoginAttempts: integer("failed_login_attempts").notNull(),
    lockedUntil: timestamp("locked_until", { mode: "date" }),

    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("users_identifier_key").on(t.identifier)]
);

// ---------------------------------------------------------------------------
// allowed_roll_numbers
// ---------------------------------------------------------------------------

export const allowedRollNumbers = pgTable("allowed_roll_numbers", {
  rollNo: varchar("roll_no", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  roomNumber: varchar("room_number", { length: 50 }),
  uploadedBy: integer("uploaded_by")
    .notNull()
    .references(() => users.id),
  uploadedAt: timestamp("uploaded_at", { mode: "date" }).notNull().defaultNow(),
  setupCode: varchar("setup_code", { length: 50 }),
});

// ---------------------------------------------------------------------------
// extras_items
// ---------------------------------------------------------------------------

export const extrasItems = pgTable("extras_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  date: date("date", { mode: "string" })
    .notNull()
    .default(sql`CURRENT_DATE`),
  mealType: mealTypeEnum("meal_type").notNull().default("lunch"),
  opensAt: timestamp("opens_at", { mode: "date" }).notNull(),
  closesAt: timestamp("closes_at", { mode: "date" }).notNull(),
  prepTimeMins: integer("prep_time_mins").notNull(),
  isRecurring: boolean("is_recurring").notNull(),
  /** 0=Monday .. 6=Sunday */
  recurringWeekday: integer("recurring_weekday"),
  isActive: boolean("is_active").notNull(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// extras_bookings
// ---------------------------------------------------------------------------

export const extrasBookings = pgTable(
  "extras_bookings",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => users.id),
    itemId: integer("item_id")
      .notNull()
      .references(() => extrasItems.id),
    qty: integer("qty").notNull(),
    totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
    status: bookingStatusEnum("status").notNull(),
    qrToken: varchar("qr_token", { length: 64 }).notNull(),
    qrUsedAt: timestamp("qr_used_at", { mode: "date" }),
    servedBy: integer("served_by").references(() => users.id),
    bookedAt: timestamp("booked_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ix_extras_bookings_qr_token").on(t.qrToken)]
);

// ---------------------------------------------------------------------------
// weekly_menu
// ---------------------------------------------------------------------------

export const weeklyMenu = pgTable(
  "weekly_menu",
  {
    id: serial("id").primaryKey(),
    /** 0=Monday .. 6=Sunday */
    dayOfWeek: integer("day_of_week").notNull(),
    mealType: mealTypeEnum("meal_type").notNull(),
    description: text("description").notNull(),
    updatedBy: integer("updated_by")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("uq_day_meal").on(t.dayOfWeek, t.mealType)]
);

// ---------------------------------------------------------------------------
// wastage_logs
// ---------------------------------------------------------------------------

export const wastageLogs = pgTable(
  "wastage_logs",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    bdmr: doublePrecision("bdmr").notNull(),
    plainWastage: doublePrecision("plain_wastage").notNull(),
    plateWastage: doublePrecision("plate_wastage").notNull(),
    enteredBy: integer("entered_by")
      .notNull()
      .references(() => users.id),
    enteredAt: timestamp("entered_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("wastage_logs_date_key").on(t.date)]
);

// ---------------------------------------------------------------------------
// notices
// ---------------------------------------------------------------------------

export const notices = pgTable("notices", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  link: varchar("link", { length: 500 }),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// rate_limits (NEW - replaces the FastAPI in-memory rate limiter so that
// limits survive serverless cold starts and are shared across instances).
// Also used as a tiny distributed throttle for the lazy maintenance jobs.
// ---------------------------------------------------------------------------

export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 255 }).primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations (for db.query.* helpers)
// ---------------------------------------------------------------------------

export const extrasItemsRelations = relations(extrasItems, ({ many, one }) => ({
  bookings: many(extrasBookings),
  creator: one(users, { fields: [extrasItems.createdBy], references: [users.id] }),
}));

export const extrasBookingsRelations = relations(extrasBookings, ({ one }) => ({
  item: one(extrasItems, { fields: [extrasBookings.itemId], references: [extrasItems.id] }),
  student: one(users, { fields: [extrasBookings.studentId], references: [users.id] }),
}));

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type AllowedRollRow = typeof allowedRollNumbers.$inferSelect;
export type ExtrasItemRow = typeof extrasItems.$inferSelect;
export type NewExtrasItemRow = typeof extrasItems.$inferInsert;
export type ExtrasBookingRow = typeof extrasBookings.$inferSelect;
export type WeeklyMenuRow = typeof weeklyMenu.$inferSelect;
export type WastageLogRow = typeof wastageLogs.$inferSelect;
export type NoticeRow = typeof notices.$inferSelect;
