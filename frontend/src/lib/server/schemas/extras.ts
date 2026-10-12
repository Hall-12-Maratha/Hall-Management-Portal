/**
 * Request schemas for items, bookings, staff booking views and worker scans
 * (port of backend/app/schemas/extras.py plus inline FastAPI query params).
 */

import { z } from "zod";

import { isoDateTime, mealType, queryInt, ymdDate } from "./common";

const recurringWeekday = z.number().int().min(0).max(6).nullish();

export const itemCreateSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
  date: ymdDate,
  meal_type: mealType,
  closes_at: isoDateTime,
  is_recurring: z.boolean().default(false),
  recurring_weekday: recurringWeekday,
});

export const itemUpdateSchema = z.object({
  name: z.string().min(1).max(255).nullish(),
  price: z.number().positive().nullish(),
  date: ymdDate.nullish(),
  meal_type: mealType.nullish(),
  closes_at: isoDateTime.nullish(),
  is_recurring: z.boolean().nullish(),
  recurring_weekday: recurringWeekday,
  is_active: z.boolean().nullish(),
});

export const bookingCreateSchema = z.object({
  item_id: z.number().int(),
  qty: z.number().int().min(1).max(10),
});

/** PUT /api/bookings/{id}?qty= */
export const bookingQtyQuerySchema = z.object({
  qty: z.coerce.number().int().min(1).max(10),
});

/** GET /api/bookings/me?start_date&end_date */
export const bookingRangeQuerySchema = z.object({
  start_date: ymdDate.optional(),
  end_date: ymdDate.optional(),
});

/** GET /api/staff/bookings?date&item_id&search */
export const staffBookingsQuerySchema = z.object({
  date: ymdDate.optional(),
  item_id: queryInt.optional(),
  search: z.string().optional(),
});

/** GET /api/staff/reports/extras/export?start_date&end_date&report_type */
export const extrasReportQuerySchema = z.object({
  start_date: ymdDate,
  end_date: ymdDate,
  report_type: z.enum(["detailed", "student"]).default("student"),
});

export const bulkDeleteSchema = z.object({
  password: z.string(),
});

export const scanRequestSchema = z.object({
  qr_token: z.string().min(1),
});
