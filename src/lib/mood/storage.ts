import type { MoodEntry } from "./types";

/**
 * Persistence layer: IndexedDB primary, localStorage mirror as fallback
 * (private-mode Safari, blocked IDB, SSR-hydration races).
 */

const DB_NAME = "bloom-mood";
const DB_VERSION = 1;
const STORE = "entries";
const LS_KEY = "bloom.mood.entries.v1";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function readLocal(): MoodEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as MoodEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(entries: MoodEntry[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch {
    /* quota — ignore, IDB remains source of truth */
  }
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T | null>((resolve) => {
    try {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function sanitize(entry: MoodEntry): MoodEntry {
  const clamp = (v: unknown, lo: number, hi: number, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  };
  return {
    ...entry,
    mood: clamp(entry.mood, 1, 10, 5),
    energy: clamp(entry.energy, 1, 10, 5),
    stress: clamp(entry.stress, 1, 10, 5),
    emotions: Array.isArray(entry.emotions) ? entry.emotions : [],
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    timestamp: new Date(entry.timestamp).toISOString(),
  };
}

export const moodStorage = {
  async all(): Promise<MoodEntry[]> {
    const db = await openDB();
    if (db) {
      const rows = await tx<MoodEntry[]>(db, "readonly", (s) => s.getAll() as IDBRequest<MoodEntry[]>);
      if (rows && rows.length) return rows.map(sanitize).sort(byTime);
      const local = readLocal();
      // Migrate any localStorage-only data into IDB once.
      if (local.length) {
        await Promise.all(local.map((e) => tx(db, "readwrite", (s) => s.put(sanitize(e)))));
        return local.map(sanitize).sort(byTime);
      }
      return [];
    }
    return readLocal().map(sanitize).sort(byTime);
  },

  async put(entry: MoodEntry): Promise<void> {
    const clean = sanitize(entry);
    const db = await openDB();
    if (db) await tx(db, "readwrite", (s) => s.put(clean));
    const local = readLocal().filter((e) => e.id !== clean.id);
    writeLocal([...local, clean].sort(byTime));
  },

  async putMany(entries: MoodEntry[]): Promise<void> {
    const clean = entries.map(sanitize);
    const db = await openDB();
    if (db) await Promise.all(clean.map((e) => tx(db, "readwrite", (s) => s.put(e))));
    const local = readLocal();
    const ids = new Set(clean.map((e) => e.id));
    writeLocal([...local.filter((e) => !ids.has(e.id)), ...clean].sort(byTime));
  },

  async remove(id: string): Promise<void> {
    const db = await openDB();
    if (db) await tx(db, "readwrite", (s) => s.delete(id));
    writeLocal(readLocal().filter((e) => e.id !== id));
  },

  async clear(): Promise<void> {
    const db = await openDB();
    if (db) await tx(db, "readwrite", (s) => s.clear());
    writeLocal([]);
  },
};

function byTime(a: MoodEntry, b: MoodEntry) {
  return a.timestamp.localeCompare(b.timestamp);
}
