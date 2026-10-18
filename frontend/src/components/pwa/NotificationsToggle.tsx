"use client";

/**
 * Web Push opt-in.
 *
 * `variant="card"` is the dashboard prompt: shown only while this browser is
 * not subscribed, and hidden for 14 days once dismissed. `variant="row"` is
 * the Profile switch that always shows the current state.
 *
 * Subscription state comes from the browser's PushManager, so rendering this
 * never costs a server request.
 */

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import {
  getCurrentSubscription,
  getPushSupport,
  subscribeToPush,
  unsubscribeFromPush,
  type PushSupport,
} from "@/lib/push";

const DISMISS_KEY = "hmp.push.dismissedAt";
const DISMISS_DAYS = 14;

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

interface Props {
  variant: "card" | "row";
}

export default function NotificationsToggle({ variant }: Props) {
  const { toast } = useToast();
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const s = getPushSupport();
      const sub = s === "available" ? await getCurrentSubscription() : null;
      if (cancelled) return;
      setSupport(s);
      setSubscribed(Boolean(sub));
      setDismissed(recentlyDismissed());
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      await subscribeToPush();
      setSubscribed(true);
      toast("Notifications enabled on this device.", "success");
    } catch (err: unknown) {
      toast((err as Error).message || "Could not enable notifications.", "error");
      setSupport(getPushSupport());
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
      toast("Notifications turned off on this device.", "success");
    } catch (err: unknown) {
      toast((err as Error).message || "Could not turn off notifications.", "error");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // storage unavailable
    }
    setDismissed(true);
  };

  if (support === null || support === "unsupported") return null;

  if (variant === "card") {
    if (subscribed || dismissed || support === "denied") return null;
    return (
      <div className="glass-card rounded-xl p-4 border-accent/30 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Get notified</p>
            <p className="text-xs text-text-muted mt-1">
              {support === "needs-install"
                ? "Add Hall 12 to your home screen (Share → Add to Home Screen), then turn on notifications from Profile."
                : "New notices, hall office messages and a heads-up before extras booking closes."}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-text-muted hover:text-text-primary text-lg leading-none px-1"
          >
            ×
          </button>
        </div>
        {support === "available" && (
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="mt-3 w-full py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {busy ? "Enabling…" : "Enable notifications"}
          </button>
        )}
      </div>
    );
  }

  // Profile row
  let status: string;
  if (support === "needs-install") status = "Add the app to your home screen first (Share → Add to Home Screen).";
  else if (support === "denied") status = "Blocked in browser settings. Allow notifications for this site to turn them on.";
  else status = subscribed ? "On for this device." : "Off. Turn on to get notices and booking reminders.";

  return (
    <div className="glass-card p-6 rounded-xl space-y-3">
      <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Notifications</h2>
      <p className="text-xs text-text-muted">{status}</p>
      {support === "available" && (
        <button
          type="button"
          onClick={subscribed ? disable : enable}
          disabled={busy}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
            subscribed
              ? "bg-bg-elevated border border-border text-text-secondary hover:text-text-primary"
              : "bg-accent hover:bg-accent-hover text-white"
          }`}
        >
          {busy ? "Please wait…" : subscribed ? "Turn off on this device" : "Turn on notifications"}
        </button>
      )}
    </div>
  );
}
