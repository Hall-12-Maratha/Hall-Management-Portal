/**
 * POST   /api/me/push-subscriptions - register this browser's Web Push
 *        subscription for the logged-in user (idempotent per endpoint).
 * DELETE /api/me/push-subscriptions - remove one endpoint.
 *
 * The client never asks the server whether it is subscribed: the browser's
 * PushManager already knows, so that check costs no request.
 */

import { and, asc, eq, notInArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireUser } from "@/lib/server/auth/guard";
import { getDb } from "@/lib/server/db/client";
import { pushSubscriptions } from "@/lib/server/db/schema";
import { handleRoute, httpError, message, parseJsonBody } from "@/lib/server/http";
import { isPushConfigured, MAX_SUBSCRIPTIONS_PER_USER } from "@/lib/server/push";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "@/lib/server/schemas/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const me = await requireUser(req);
  if (!isPushConfigured()) {
    httpError(503, "Push notifications are not enabled on this server.");
  }
  const body = await parseJsonBody(req, pushSubscribeSchema);
  const db = getDb();

  await db
    .insert(pushSubscriptions)
    .values({
      userId: me.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      // A browser profile that logs in as someone else re-owns the endpoint.
      set: { userId: me.id, p256dh: body.keys.p256dh, auth: body.keys.auth, createdAt: new Date() },
    });

  // Keep only the newest devices per user.
  const keep = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, me.id))
    .orderBy(asc(pushSubscriptions.createdAt), asc(pushSubscriptions.id))
    .offset(0);
  if (keep.length > MAX_SUBSCRIPTIONS_PER_USER) {
    const newestIds = keep.slice(-MAX_SUBSCRIPTIONS_PER_USER).map((r) => r.id);
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, me.id), notInArray(pushSubscriptions.id, newestIds)));
  }

  return message("Subscribed to notifications.", 201);
});

export const DELETE = handleRoute(async (req: NextRequest) => {
  const me = await requireUser(req);
  const body = await parseJsonBody(req, pushUnsubscribeSchema);

  await getDb()
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, me.id), eq(pushSubscriptions.endpoint, body.endpoint)));

  return message("Unsubscribed from notifications.");
});
