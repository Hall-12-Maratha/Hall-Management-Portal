/**
 * Request schemas for /api/hall-office/* (port of backend/app/schemas/hall_office.py).
 */

import { z } from "zod";

import { optionalString } from "./common";

export const staffCreateSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.enum(["mess_staff", "mess_worker"], {
    message: "Must be 'mess_staff' or 'mess_worker'.",
  }),
});

export const staffToggleSchema = z.object({
  is_active: z.boolean(),
});

export const ROLL_NO_RE = /^[A-Za-z0-9-]+$/;

export const allowedRollCreateSchema = z.object({
  roll_no: z.string().min(3).max(50).regex(ROLL_NO_RE, "Invalid roll number."),
  name: optionalString(255),
  email: z.email().nullish().transform((value) => value ?? null),
  room_number: optionalString(50),
});
