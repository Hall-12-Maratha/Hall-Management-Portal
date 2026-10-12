/**
 * Request schemas for /api/auth/* (port of backend/app/schemas/auth.py).
 */

import { z } from "zod";

import { optionalString, password } from "./common";

const setupCode = z.string().length(8, "Setup code must be exactly 8 characters.");

export const setupVerifySchema = z.object({
  roll_no: z.string(),
  setup_code: setupCode,
});

export const setupCompleteSchema = z.object({
  roll_no: z.string(),
  setup_code: setupCode,
  password,
  name: z.string().min(1).max(255),
  room_no: optionalString(50),
});

export const forgotPasswordRequestOtpSchema = z.object({
  email: z.email(),
});

export const forgotPasswordVerifyOtpSchema = z.object({
  email: z.email(),
  otp: z.string().length(6, "OTP must be exactly 6 digits."),
});

export const forgotPasswordResetSchema = z.object({
  reset_token: z.string().min(1),
  new_password: password,
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const forcedChangePasswordSchema = z.object({
  change_token: z.string().min(1),
  new_password: password,
});

export const authenticatedChangePasswordSchema = z.object({
  old_password: z.string(),
  new_password: password,
});
