/**
 * Bloom Story Platform — seen + progress persistence.
 * Local-first (instant ring updates), server views recorded best-effort
 * through the interactions service. Never blocks the viewer.
 */

const SEEN_KEY = "bloom.story.seen.v2";
const PROGRESS_KEY = "bloom.story.progress.v2";
const MAX_IDS = 400;

function readMap(key: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_IDS);
    window.localStorage.setItem(key, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* best-effort */
  }
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("bloom:story-seen"));
}

export const seenStore = {
  has(storyId: string): boolean {
    return storyId in readMap(SEEN_KEY);
  },
  mark(storyId: string): void {
    const map = readMap(SEEN_KEY);
    if (storyId in map) return;
    map[storyId] = Date.now();
    writeMap(SEEN_KEY, map);
    notify();
  },
  markMany(storyIds: string[]): void {
    const map = readMap(SEEN_KEY);
    let changed = false;
    for (const id of storyIds) {
      if (!(id in map)) {
        map[id] = Date.now();
        changed = true;
      }
    }
    if (changed) {
      writeMap(SEEN_KEY, map);
      notify();
    }
  },
  /** How many of these ids are unseen. */
  unseenCount(storyIds: string[]): number {
    const map = readMap(SEEN_KEY);
    return storyIds.filter((id) => !(id in map)).length;
  },
  subscribe(fn: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("bloom:story-seen", fn);
    return () => window.removeEventListener("bloom:story-seen", fn);
  },
};

/** Viewer progress per rail owner: resume where you left off. */
export const progressStore = {
  get(ownerId: string): number {
    return readMap(PROGRESS_KEY)[ownerId] ?? 0;
  },
  set(ownerId: string, index: number): void {
    const map = readMap(PROGRESS_KEY);
    map[ownerId] = Math.max(0, Math.round(index));
    writeMap(PROGRESS_KEY, map);
  },
  clear(ownerId: string): void {
    const map = readMap(PROGRESS_KEY);
    delete map[ownerId];
    writeMap(PROGRESS_KEY, map);
  },
};
