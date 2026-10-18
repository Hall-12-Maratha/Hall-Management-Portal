/**
 * Browser-side Web Push helpers.
 *
 * The subscription state is read from the browser's PushManager, so checking
 * whether this device is subscribed costs no server request. Only subscribe
 * and unsubscribe talk to the API.
 */

import { apiFetch } from "@/lib/api";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushSupport =
  | "unsupported" // browser has no push API, or the server has no VAPID key
  | "needs-install" // iOS Safari: push only works from the home-screen app
  | "denied" // the user blocked notifications in the browser
  | "available";

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  return "available";
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  // The worker is registered on load (ServiceWorkerRegister); in development it
  // is never registered, so `ready` would hang. getRegistration() resolves either way.
  return (await navigator.serviceWorker.getRegistration("/")) ?? null;
}

/** The current subscription of this browser, or null. No network. */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await getRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Ask for permission (must be called from a user gesture), subscribe this
 * browser and register the subscription with the server.
 * Throws an Error with a user-readable message on failure.
 */
export async function subscribeToPush(): Promise<void> {
  const reg = await getRegistration();
  if (!reg) {
    throw new Error("Notifications are not available in this browser yet. Reload the page and try again.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications were not allowed.");
  }
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  await apiFetch("/me/push-subscriptions", {
    method: "POST",
    body: JSON.stringify(subscription.toJSON()),
  });
}

/** Unsubscribe this browser and tell the server to forget it. */
export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => undefined);
  await apiFetch("/me/push-subscriptions", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}
