/**
 * Shared zod building blocks mirroring Pydantic field types.
 */

import { z } from "zod";

import { isValidYmd } from "../dates";
import { MAX_PASSWORD_BYTES } from "../auth/password";
import { MEAL_TYPES } from "../db/schema";

/** Pydantic `date`: ISO calendar date "YYYY-MM-DD". */
export const ymdDate = z
  .string()
  .refine(isValidYmd, { message: "Invalid date, expected YYYY-MM-DD." });

/** Pydantic `datetime`: ISO-8601 string (naive values are treated as UTC). */
export const isoDateTime = z
  .string()
  .min(1)
  .transform((value, ctx) => {
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
    const parsed = new Date(hasZone || !value.includes("T") ? value : `${value}Z`);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid datetime." });
      return z.NEVER;
    }
    return parsed;
  });

export const mealType = z.enum(MEAL_TYPES);

/** Password rules: 8..128 chars (Pydantic) and at most 72 bytes (bcrypt). */
export const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .refine((value) => Buffer.byteLength(value, "utf8") <= MAX_PASSWORD_BYTES, {
    message: `Password must be at most ${MAX_PASSWORD_BYTES} bytes.`,
  });

/** Optional string that may be omitted or null (Pydantic `str | None = None`). */
export const optionalString = (max?: number) => {
  const base = max === undefined ? z.string() : z.string().max(max);
  return base.nullish().transform((value) => value ?? null);
};

/** Positive integer id from a query string. */
export const queryInt = z.coerce.number().int();
