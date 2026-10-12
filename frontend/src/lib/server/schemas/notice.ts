/**
 * Request schemas for notices (port of backend/app/schemas/notice.py).
 */

import { z } from "zod";

import { optionalString } from "./common";

export const noticeCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  link: optionalString(500),
});
