/**
 * Request schemas for wastage logs (port of backend/app/schemas/wastage.py).
 */

import { z } from "zod";

import { ymdDate } from "./common";

const nonNegative = z.number().min(0);

export const wastageCreateSchema = z.object({
  date: ymdDate,
  bdmr: nonNegative,
  plain_wastage: nonNegative,
  plate_wastage: nonNegative,
});
