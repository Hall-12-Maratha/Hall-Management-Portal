/**
 * Request schemas for /api/me/push-subscriptions.
 * The body is the JSON form of a browser PushSubscription.
 */

import { z } from "zod";

const endpoint = z
  .url()
  .max(1000)
  .refine((value) => value.startsWith("https://"), { message: "Endpoint must be https." });

export const pushSubscribeSchema = z.object({
  endpoint,
  expirationTime: z.number().nullish(),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint,
});
