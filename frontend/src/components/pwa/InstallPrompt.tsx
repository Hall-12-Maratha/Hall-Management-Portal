"use client";

/**
 * "Install app" banner.
 *
 * Android/Chrome fire `beforeinstallprompt`; we hold the event and show a
 * button that triggers the native install dialog. iOS has no such event, so
 * we show a short hint about Share -> Add to Home Screen instead. Dismissal is
 * remembered in localStorage for 14 days. Hidden once the app is installed.
 */

import { useEffect, useState } from "react";

const DISMISS_KEY = "hmp.install.dismissedAt";
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    // A link such as /?install=1 (from a notice or email) always shows the
    // banner, even if it was dismissed earlier.
    const forced = new URLSearchParams(window.location.search).has("install");
    if (!forced && recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari never fires beforeinstallprompt; show the manual hint after a
    // short delay so it does not compete with the page's first paint. When the
    // banner was requested via the link, show the hint on any browser that has
    // not offered the install event by then (e.g. Chrome's cooldown).
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const hintTimer =
      isIos || forced
        ? window.setTimeout(() => {
            setShowIosHint(true);
            setVisible(true);
          }, 1500)
        : undefined;

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (hintTimer !== undefined) window.clearTimeout(hintTimer);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // storage unavailable: just hide for this session
    }
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setVisible(false);
    else dismiss();
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install the Hall 12 app"
      className="fixed inset-x-3 bottom-20 sm:bottom-4 sm:left-auto sm:right-4 sm:w-80 z-40 glass-card rounded-2xl p-4 shadow-xl animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">Add Hall 12 to your home screen</p>
          <p className="text-xs text-text-muted mt-1">
            {showIosHint && !installEvent
              ? /iphone|ipad|ipod/i.test(navigator.userAgent)
                ? "Tap Share, then “Add to Home Screen” to use the portal like an app."
                : "Open your browser menu and choose “Install app” or “Add to Home screen”."
              : "Faster access to the menu, extras and your bill, right from your phone."}
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
      {installEvent && (
        <button
          type="button"
          onClick={install}
          className="mt-3 w-full py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
        >
          Install app
        </button>
      )}
    </div>
  );
}
