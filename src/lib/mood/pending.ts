/**
 * The Mood outbox — entries written on this device that the account hasn't
 * confirmed yet (`bloom.mood.pending.v1`).
 *
 * Mood used to be the only module that failed offline or signed out: a save
 * either reached the table or was rolled back in front of the person. Now,
 * exactly like trackers, cycle and habits, the device is written FIRST and
 * the account catches up — on the next successful push, on reconnect, or at
 * sign-in. What is shown on screen is always `applyPending(remote, queue)`:
 * the account's copy with this device's unconfirmed changes laid over it.
 *
 * Pure functions here; the network lives in lib/mood/record.
 */
import { contextFromJson } from "./context";
import { EMOTION_MAP, type EmotionKey, type MoodEntry } from "./types";

export const PENDING_KEY = "bloom.mood.pending.v1";

export interface PendingQueue {
  /** Saves (new entries and edits) not yet confirmed by the account. */
  entries: MoodEntry[];
  /** Ids of account rows deleted here, not yet deleted there. */
  removed: string[];
}

export const EMPTY_QUEUE: PendingQueue = { entries: [], removed: [] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Rows created here have a local id until the table hands back a uuid. */
export const isLocalId = (id: string): boolean => !UUID.test(id);

const clampScore = (v: unknown): number | null => {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(1, Math.min(10, v));
};

/** Tolerates anything on disk: a bad row is dropped, never thrown. */
export function normalizeEntry(raw: unknown): MoodEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r["id"] !== "string" || !r["id"]) return null;
  if (typeof r["timestamp"] !== "string" || Number.isNaN(Date.parse(r["timestamp"]))) return null;
  const mood = clampScore(r["mood"]);
  if (mood === null) return null;
  const emotions = Array.isArray(r["emotions"])
    ? [
        ...new Set(
          (r["emotions"] as unknown[]).filter(
            (e): e is EmotionKey => typeof e === "string" && e in EMOTION_MAP,
          ),
        ),
      ]
    : [];
  const tags = Array.isArray(r["tags"])
    ? (r["tags"] as unknown[]).filter((t): t is string => typeof t === "string" && t.trim() !== "")
    : [];
  const entry: MoodEntry = {
    id: r["id"],
    timestamp: new Date(r["timestamp"]).toISOString(),
    mood,
    energy: clampScore(r["energy"]) ?? 5,
    stress: clampScore(r["stress"]) ?? 5,
    emotions: emotions.length ? emotions : ["neutral"],
    tags,
    note: typeof r["note"] === "string" && r["note"].trim() ? r["note"] : undefined,
    ...contextFromJson(r),
  };
  return entry;
}

export function normalizeQueue(raw: unknown): PendingQueue {
  if (!raw || typeof raw !== "object") return EMPTY_QUEUE;
  const r = raw as Record<string, unknown>;
  const entries = Array.isArray(r["entries"])
    ? (r["entries"] as unknown[]).map(normalizeEntry).filter((e): e is MoodEntry => e !== null)
    : [];
  const removed = Array.isArray(r["removed"])
    ? [...new Set((r["removed"] as unknown[]).filter((id): id is string => typeof id === "string"))]
    : [];
  return { entries, removed };
}

/* -------------------------------- storage -------------------------------- */

const hasWindow = () => typeof window !== "undefined";

export function loadPending(): PendingQueue {
  if (!hasWindow()) return EMPTY_QUEUE;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    return raw ? normalizeQueue(JSON.parse(raw)) : EMPTY_QUEUE;
  } catch {
    return EMPTY_QUEUE;
  }
}

export function savePending(queue: PendingQueue): void {
  if (!hasWindow()) return;
  try {
    if (queue.entries.length === 0 && queue.removed.length === 0) {
      window.localStorage.removeItem(PENDING_KEY);
    } else {
      window.localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
    }
  } catch {
    /* non-fatal: the account copy is still the fallback */
  }
}

/* --------------------------------- edits --------------------------------- */

/** A save replaces any earlier unconfirmed save of the same entry. */
export function enqueueSave(queue: PendingQueue, entry: MoodEntry): PendingQueue {
  return {
    entries: [...queue.entries.filter((e) => e.id !== entry.id), entry],
    removed: queue.removed.filter((id) => id !== entry.id),
  };
}

/**
 * A delete drops any unconfirmed save of the entry; only rows the account
 * already has (uuid ids) need to be deleted there too.
 */
export function enqueueRemove(queue: PendingQueue, id: string): PendingQueue {
  const entries = queue.entries.filter((e) => e.id !== id);
  const removed =
    isLocalId(id) || queue.removed.includes(id) ? queue.removed : [...queue.removed, id];
  return { entries, removed };
}

/** The account confirmed this save (possibly under a new id) — forget it. */
export function confirmSave(queue: PendingQueue, localId: string): PendingQueue {
  return { ...queue, entries: queue.entries.filter((e) => e.id !== localId) };
}

export function confirmRemove(queue: PendingQueue, id: string): PendingQueue {
  return { ...queue, removed: queue.removed.filter((r) => r !== id) };
}

export function queueSize(queue: PendingQueue): number {
  return queue.entries.length + queue.removed.length;
}

/* -------------------------------- display -------------------------------- */

const byTime = (a: MoodEntry, b: MoodEntry) => a.timestamp.localeCompare(b.timestamp);

/** The account's copy with this device's unconfirmed changes laid over it. */
export function applyPending(remote: readonly MoodEntry[], queue: PendingQueue): MoodEntry[] {
  const overridden = new Set(queue.entries.map((e) => e.id));
  const removed = new Set(queue.removed);
  return [
    ...remote.filter((e) => !overridden.has(e.id) && !removed.has(e.id)),
    ...queue.entries,
  ].sort(byTime);
}
