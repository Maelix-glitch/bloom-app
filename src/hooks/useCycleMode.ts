/**
 * useCycleMode — the cycle mode as it applies today, without the whole period
 * store. Used by the nav (hide "Cycle" when off) and the coach record. Reads
 * the same settings the Cycle page writes and follows them live.
 *
 * Cached at module level via `useSyncExternalStore`, for the same reason as
 * `useOnboarding`: `AppNav` is mounted per-route, so a plain
 * useState/useEffect pair restarted from its default on every tab change and
 * flashed the "Cycle" entry at people who had switched it off. The cache means
 * only the very first mount of a page load has to correct itself.
 */

import { useCallback, useSyncExternalStore } from "react";

import {
  CYCLE_SETTINGS_CHANGED,
  effectiveMode,
  loadCycleSettings,
  PERIODS_CHANGED,
  type CycleMode,
} from "@/lib/cycle/periodStore";
import { todayKey } from "@/lib/cycle/predict";

const hasWindow = () => typeof window !== "undefined";

let cached: CycleMode | null = null;
const listeners = new Set<() => void>();

function invalidate(): void {
  cached = null;
  for (const l of listeners) l();
}

let wired = false;
function subscribe(onChange: () => void): () => void {
  if (!wired && hasWindow()) {
    wired = true;
    window.addEventListener(PERIODS_CHANGED, invalidate);
    window.addEventListener(CYCLE_SETTINGS_CHANGED, invalidate);
    window.addEventListener("storage", invalidate);
  }
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): CycleMode {
  if (cached === null) cached = effectiveMode(loadCycleSettings(), todayKey());
  return cached;
}

/* "tracking" on the server, so SSR and the hydration pass agree. */
const getServerSnapshot = (): CycleMode => "tracking";

export function useCycleMode(): CycleMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Forget the cached mode (used by "erase everything" and by tests). */
export const resetCycleModeCache = invalidate;

/**
 * The mode is derived partly from *today's date*, so a session left open
 * across midnight can hold a stale answer (a pause that expired overnight).
 * Cheap to re-check when the tab comes back to the foreground.
 */
if (hasWindow()) {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) invalidate();
  });
}

export type { CycleMode };
