/**
 * Web Push sending (VAPID, via the `web-push` package).
 *
 * Subscriptions live in `push_subscriptions`, one row per browser/device.
 * Sending is best-effort: every call resolves, failures are logged, and
 * endpoints the push service reports as gone (404/410) are deleted.
 *
 * Payload privacy: a notification can be read on a locked screen, so callers
 * never put personal content (bill amounts, warnings) in `body`.
 *
 * Call sites run inside `after()` from next/server so the HTTP response is
 * not delayed by the fan-out.
 */

import { and, eq, inArray } from "drizzle-orm";
import webpush from "web-push";

import { getDb } from "./db/client";
import { getEnv } from "./env";
import { pushSubscriptions, users } from "./db/schema";

export interface PushPayload {
  title: string;
  body: string;
  /** Same-origin path to open on tap (defaults to the student dashboard). */
  url?: string;
  /** Notifications with the same tag replace each other instead of stacking. */
  tag?: string;
}

/** Payload for a personal notice: deliberately content-free (lock screens). */
export const PERSONAL_NOTICE_PUSH: PushPayload = {
  title: "New notice from the hall office",
  body: "You have a personal notice. Open the app to read it.",
  url: "/student/dashboard",
  tag: "personal-notice",
};

/** How many sends run concurrently; keeps the function under its time budget. */
const SEND_CONCURRENCY = 50;

/** Devices per user; the oldest rows are dropped beyond this. */
export const MAX_SUBSCRIPTIONS_PER_USER = 10;

let configured: boolean | null = null;

/** True when all three VAPID variables are present (checked once per process). */
export function isPushConfigured(): boolean {
  if (configured !== null) return configured;
  const env = getEnv();
  configured = Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
  if (configured) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  } else {
    console.info("[push] VAPID keys not set; push notifications are disabled.");
  }
  return configured;
}

/** Test helper. */
export function resetPushConfigCache(): void {
  configured = null;
}

interface Target {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function deliver(targets: Target[], payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!isPushConfigured() || targets.length === 0) return { sent: 0, removed: 0 };

  const body = JSON.stringify({ url: "/student/dashboard", ...payload });
  const gone: number[] = [];
  let sent = 0;

  for (let i = 0; i < targets.length; i += SEND_CONCURRENCY) {
    const batch = targets.slice(i, i + SEND_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((t) =>
        webpush.sendNotification(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          body,
          { TTL: 60 * 60 * 12, urgency: "normal" }
        )
      )
    );
    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        sent += 1;
        return;
      }
      const status = (result.reason as { statusCode?: number } | undefined)?.statusCode;
      if (status === 404 || status === 410) {
        gone.push(batch[idx].id);
      } else {
        console.warn(`[push] send failed (${status ?? "network"}):`, (result.reason as Error)?.message);
      }
    });
  }

  if (gone.length > 0) {
    await getDb().delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
  }
  console.info(`[push] "${payload.title}": sent ${sent}/${targets.length}, removed ${gone.length} stale.`);
  return { sent, removed: gone.length };
}

/** Send to every device of every active student. */
export async function pushToAllStudents(payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!isPushConfigured()) return { sent: 0, removed: 0 };
  const targets = await getDb()
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(users, eq(pushSubscriptions.userId, users.id))
    .where(and(eq(users.role, "student"), eq(users.isActive, true)));
  return deliver(targets, payload);
}

/** Send to every device of the given users. */
export async function pushToUsers(userIds: number[], payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!isPushConfigured() || userIds.length === 0) return { sent: 0, removed: 0 };
  const targets = await getDb()
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));
  return deliver(targets, payload);
}

/** Run a push job in the background; never throws. For use inside `after()`. */
export function pushInBackground(task: () => Promise<unknown>): Promise<void> {
  return task().then(
    () => undefined,
    (err) => console.error("[push] background send failed:", err)
  );
}

/** Trim a notice body for a notification line. */
export function previewText(text: string, max = 120): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}…`;
}
