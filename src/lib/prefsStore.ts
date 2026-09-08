/**
 * A synchronous, cached view of a preference — so remounting can't flicker.
 *
 * The bug this exists to kill: `AppNav` is rendered by each route rather than
 * by the layout, so every tab change unmounts and remounts the sidebar. Hooks
 * built the usual way — `useState(default)` plus a `useEffect` that reads
 * storage — therefore start from their default on *every* navigation, paint
 * once, and only then correct themselves. For the cycle nav entry that meant a
 * visible flash of "Cycle" on someone who had switched it off, on every single
 * tab change.
 *
 * The fix is to read once and remember. A module-level cache survives component
 * unmounts, so the second and every subsequent mount has the real value
 * available *synchronously, during render* — nothing to correct, nothing to
 * flash.
 *
 * `useSyncExternalStore` is the right primitive: it takes a separate server
 * snapshot (so SSR and hydration still agree and React doesn't warn), and it
 * subscribes to changes so a write on another tab still propagates.
 */

import { useCallback, useSyncExternalStore } from "react";

import { getPref, PREFS_CHANGED } from "@/lib/prefs";

const hasWindow = () => typeof window !== "undefined";

/** key -> last known value. Populated on first read, kept across unmounts. */
const cache = new Map<string, unknown>();
const listeners = new Set<() => void>();

/** Drop everything and tell every subscriber to re-read. */
function invalidate(): void {
  cache.clear();
  for (const l of listeners) l();
}

let wired = false;
function wire(): void {
  if (wired || !hasWindow()) return;
  wired = true;
  /* Same-tab writes go through setPref, which fires PREFS_CHANGED; other tabs
     arrive as a storage event. Both mean "the cache is stale". */
  window.addEventListener(PREFS_CHANGED, invalidate);
  window.addEventListener("storage", invalidate);
}

function subscribe(onChange: () => void): () => void {
  wire();
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/**
 * Read a preference with a cached, synchronous snapshot.
 *
 * `parse` and `fallback` match `getPref`. `parse` must be stable (defined at
 * module scope, or memoised) — it is only consulted on a cache miss, but an
 * unstable identity would still churn the subscription.
 */
export function usePrefValue<T>(
  key: string,
  parse: (raw: unknown) => T | null,
  fallback: T,
): T {
  const getSnapshot = useCallback((): T => {
    if (cache.has(key)) return cache.get(key) as T;
    const value = getPref<T>(key, parse, fallback);
    cache.set(key, value);
    return value;
  }, [key, parse, fallback]);

  /*
   * The server has no storage, so it always sees the fallback. React uses this
   * for the SSR pass *and* the hydration pass, which is what keeps the markup
   * identical; it then re-renders with the client snapshot immediately after.
   * That single correction happens once per page load, not once per navigation.
   */
  const getServerSnapshot = useCallback((): T => fallback, [fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Test seam / "erase everything" hook: forget what we've cached. */
export const resetPrefCache = invalidate;
