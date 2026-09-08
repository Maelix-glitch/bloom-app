/**
 * B6 · Installing Bloom on the phone.
 *
 * Registers the service worker (once, after load, so it never competes with
 * the first paint) and captures Chrome's `beforeinstallprompt` so the app can
 * offer "Add to home screen" in its own words instead of hoping the browser
 * shows a banner. iOS has no such event — there the hook reports
 * `canInstall: false, ios: true` so the UI can show the Share → Add to Home
 * Screen instructions instead.
 */

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let registered = false;

/** Registers `/sw.js`. Safe to call from anywhere; only the first call works. */
export function registerServiceWorker(): void {
  if (registered || typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  registered = true;
  const go = () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* http, private mode, or an unsupported browser — the app still works */
    });
  };
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

export const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
};

const isIos = (): boolean =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

export interface InstallState {
  /** Chrome/Edge/Android: a real prompt is available. */
  canInstall: boolean;
  /** Already running from the home screen. */
  installed: boolean;
  /** iOS: no prompt exists, show the Share-sheet instructions. */
  ios: boolean;
  /** Resolves to true when the person accepted. */
  install: () => Promise<boolean>;
}

export function useInstallPrompt(): InstallState {
  const [canInstall, setCanInstall] = useState(Boolean(deferred));
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    setInstalled(isStandalone());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferred = null;
      setCanInstall(false);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    const event = deferred;
    deferred = null;
    setCanInstall(false);
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      return outcome === "accepted";
    } catch {
      return false;
    }
  }, []);

  return { canInstall, installed, ios: isIos() && !isStandalone(), install };
}
