/**
 * Request schemas for personal notices (/api/hall-office/personal-notices).
 */

import { z } from "zod";

import { ROLL_NO_RE } from "./hallOffice";

export const PERSONAL_NOTICE_TITLE_MAX = 255;
export const PERSONAL_NOTICE_TEXT_MAX = 4000;

export const personalNoticeCreateSchema = z.object({
  roll_no: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(ROLL_NO_RE, "Invalid roll number.")
    .transform((value) => value.toUpperCase()),
  title: z.string().trim().min(1).max(PERSONAL_NOTICE_TITLE_MAX),
  notice: z.string().trim().min(1).max(PERSONAL_NOTICE_TEXT_MAX),
});

export const personalNoticesQuerySchema = z.object({
  roll_no: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => (value ? value.toUpperCase() : undefined)),
});
