/**
 * Tour persistence — local-first, like everything in Bloom.
 * One JSON blob, no network.
 */

const KEY = "bloom:tour:v1";

export interface TourPersist {
  completed: Record<string, boolean>;
  dismissedGlobal?: boolean | undefined;
  lastSeenAt?: string | undefined;
}

const DEFAULT: TourPersist = { completed: {} };

export async function loadTourPersist(): Promise<TourPersist> {
  return loadTourSync();
}

export async function saveTourPersist(next: TourPersist): Promise<void> {
  saveTourSync(next);
}

/** Synchronous fallback for SSR / immediate read */
export function loadTourSync(): TourPersist {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as TourPersist;
    return { completed: parsed.completed ?? {}, dismissedGlobal: parsed.dismissedGlobal, lastSeenAt: parsed.lastSeenAt };
  } catch {
    return DEFAULT;
  }
}

export function saveTourSync(next: TourPersist): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
