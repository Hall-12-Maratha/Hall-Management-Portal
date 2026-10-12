/**
 * Request schemas for the weekly menu (port of backend/app/schemas/menu.py).
 */

import { z } from "zod";

export const menuSlotUpdateSchema = z.object({
  description: z.string().max(1000),
});
