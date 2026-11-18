/**
 * useConnectivity — the browser's own word on whether this device is
 * online, kept current by the online/offline events.
 *
 * This is the signal the sync pill was missing: `navigator.onLine` is the
 * device saying "I have no network path at all" — when it reports false,
 * no sync claim may stand. (It can report true on a captive or broken
 * network; the stores' own settled states remain the authority there,
 * which is why the offline model only downgrades on a definite offline.)
 *
 * SSR-safe: the server renders "online" (it makes no sync claim of its
 * own — the pill renders only settled states, and hydration corrects the
 * value before any interaction).
 */

import { useEffect, useState } from "react";

export function useConnectivity(): boolean {
  const [online, setOnline] = useState<boolean>(
    () => typeof navigator === "undefined" || navigator.onLine !== false,
  );

  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
