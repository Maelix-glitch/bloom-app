/**
 * The Mood record — one in-memory copy of the person's entries, shared by
 * every screen that reads it (Today, /mood, /mood/intelligence, Coach).
 * Before this each `useMoodSystem()` fetched the whole table on mount, and
 * the auth client's INITIAL_SESSION event fetched it *again* a moment later,
 * flipping `loading` back on — which unmounted and remounted the entire page
 * (the "flicker") and made every navigation start from a spinner (the "lag").
 * Now the first screen loads it, later screens open on the cached copy
 * instantly, and a save on one screen is visible on all of them at once.
 * Revalidation happens in the background without touching `loading`.
 *
 * Device first (Tier A · A12): a save is written to the outbox on this device
 * before anything else and shown immediately. The account catches up — right
 * away when it can, otherwise on reconnect or at sign-in. Signed out or
 * offline, Mood keeps working exactly like trackers, cycle and habits do;
 * `sync` says honestly where each entry is.
 */
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { moodStorage } from "@/lib/mood/storage";
import {
  applyPending,
  confirmRemove,
  confirmSave,
  enqueueRemove,
  enqueueSave,
  isLocalId,
  loadPending,
  queueSize,
  savePending,
  type PendingQueue,
} from "@/lib/mood/pending";
import type { MoodEntry } from "@/lib/mood/types";

export type MoodSyncState =
  /** No database in this environment — everything stays on the device. */
  "off" | "loading" | "signed-out" | "saved" | "pending" | "error";

export type MoodSync = {
  state: MoodSyncState;
  message: string;
  signedIn: boolean;
  /** Entries/deletions still waiting for the account. */
  pending: number;
};

export type MoodRecordState = {
  /** True only until the first read for the current user resolves. */
  loading: boolean;
  /** The account's copy with this device's unconfirmed changes laid over it. */
  entries: MoodEntry[];
  profileId: string | null;
  /** Set only when the record could not be READ; saving never sets it. */
  authError: string | null;
  sync: MoodSync;
};

const NO_CONFIG =
  "Bloom isn't connected to a database in this environment, so your Mood record stays on this device.";
const SIGNED_OUT =
  "You're not signed in — entries you log stay on this device and move to your account when you sign in.";

const byTime = (a: MoodEntry, b: MoodEntry) => a.timestamp.localeCompare(b.timestamp);

/* --------------------------------- state --------------------------------- */

let remote: MoodEntry[] = [];
let queue: PendingQueue = { entries: [], removed: [] };
let queueLoaded = false;

let state: MoodRecordState = {
  loading: true,
  entries: [],
  profileId: null,
  authError: null,
  sync: { state: "loading", message: "Checking your account…", signedIn: false, pending: 0 },
};
const listeners = new Set<() => void>();
let started = false;
let inflight: Promise<void> | null = null;
let flushing: Promise<void> | null = null;
let loadedFor: string | null = null;

function emit() {
  for (const l of listeners) l();
}

function set(patch: Partial<MoodRecordState>) {
  state = { ...state, ...patch };
  emit();
}

function ensureQueue() {
  if (queueLoaded || typeof window === "undefined") return;
  queueLoaded = true;
  queue = loadPending();
}

/** Recompute what the screens see and what the sync line says. */
function publish(sync?: Partial<MoodSync>) {
  const pending = queueSize(queue);
  const base: MoodSync = { ...state.sync, ...sync, pending };
  set({ entries: applyPending(remote, queue), sync: base });
}

function syncLine(profileId: string | null): MoodSync {
  const pending = queueSize(queue);
  if (!hasSupabaseConfig) {
    return { state: "off", message: "Saved on this device.", signedIn: false, pending };
  }
  if (!profileId) {
    return {
      state: "signed-out",
      message:
        pending > 0
          ? `Saved on this device — ${pending === 1 ? "1 entry moves" : `${pending} entries move`} to your account when you sign in.`
          : "Saved on this device — sign in to keep it on your account.",
      signedIn: false,
      pending,
    };
  }
  if (pending > 0) {
    return {
      state: "error",
      message: `Saved here — ${pending === 1 ? "1 entry" : `${pending} entries`} not yet on your account. Bloom will retry.`,
      signedIn: true,
      pending,
    };
  }
  return { state: "saved", message: "Saved to your account.", signedIn: true, pending };
}

function setQueue(next: PendingQueue) {
  queue = next;
  savePending(queue);
}

/* --------------------------------- reads --------------------------------- */

/** Fetch (or refresh) the record for `id`. Only the very first read shows `loading`. */
function load(id: string, { silent }: { silent: boolean }) {
  if (inflight) return inflight;
  if (!silent) set({ loading: true, authError: null });
  inflight = moodStorage
    .all(id)
    .then((rows) => {
      loadedFor = id;
      remote = rows.sort(byTime);
      set({ loading: false, authError: null });
      publish(syncLine(id));
    })
    .catch((error: unknown) => {
      console.error("Could not load mood entries:", error);
      set({
        loading: false,
        authError: error instanceof Error ? error.message : "Could not load your Mood record.",
      });
      publish({
        state: "error",
        message: "Couldn't reach your account — showing what this device has.",
        signedIn: true,
      });
    })
    .finally(() => {
      inflight = null;
      void flush();
    });
  return inflight;
}

function signedOut() {
  loadedFor = null;
  remote = [];
  set({ profileId: null, loading: false, authError: SIGNED_OUT });
  publish(syncLine(null));
}

/* -------------------------------- outbox --------------------------------- */

/**
 * Push everything in the outbox to the account, in order. A failure leaves
 * the item queued for the next attempt; a success drops it and folds the
 * confirmed row (with its real id) into the account copy.
 */
function flush(): Promise<void> {
  if (flushing) return flushing;
  const id = state.profileId;
  if (!id || !hasSupabaseConfig || queueSize(queue) === 0) return Promise.resolve();

  flushing = (async () => {
    publish({ state: "pending", message: "Saving to your account…", signedIn: true });
    let failed = false;
    for (const entry of [...queue.entries]) {
      try {
        const saved = await moodStorage.put(id, entry);
        remote = [...remote.filter((e) => e.id !== entry.id && e.id !== saved.id), saved].sort(
          byTime,
        );
        setQueue(confirmSave(queue, entry.id));
        publish();
      } catch (error) {
        console.error("Could not save mood entry:", error);
        failed = true;
        break;
      }
    }
    if (!failed) {
      for (const rid of [...queue.removed]) {
        try {
          await moodStorage.remove(id, rid);
          remote = remote.filter((e) => e.id !== rid);
          setQueue(confirmRemove(queue, rid));
          publish();
        } catch (error) {
          console.error("Could not delete mood entry:", error);
          failed = true;
          break;
        }
      }
    }
    publish(syncLine(id));
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/* --------------------------------- wiring -------------------------------- */

/** Wire the store to auth once; idempotent, safe to call from every hook mount. */
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  ensureQueue();

  window.addEventListener("online", () => void flush());
  window.addEventListener("focus", () => void flush());

  if (!hasSupabaseConfig) {
    set({ profileId: null, loading: false, authError: NO_CONFIG });
    publish(syncLine(null));
    return;
  }

  void supabase.auth.getSession().then(({ data: { session } }) => {
    const user = session?.user;
    if (!user) return signedOut();
    set({ profileId: user.id });
    void load(user.id, { silent: false });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    if (!user) return signedOut();
    if (state.profileId !== user.id) set({ profileId: user.id });
    // Same user already loaded (INITIAL_SESSION / TOKEN_REFRESHED / focus):
    // revalidate quietly instead of dropping the page back to a spinner.
    void load(user.id, { silent: loadedFor === user.id });
  });
}

export const moodRecord = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    start();
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): MoodRecordState {
    return state;
  },
  getServerSnapshot(): MoodRecordState {
    return SERVER_SNAPSHOT;
  },

  /**
   * Insert or replace an entry. The device copy is written first and shown
   * at once; the account is brought up to date right after (or later, if it
   * can't be reached now). Never rolls the entry back.
   */
  async save(entry: MoodEntry): Promise<void> {
    ensureQueue();
    setQueue(enqueueSave(queue, entry));
    publish(syncLine(state.profileId));
    await flush();
  },

  async remove(entryId: string): Promise<void> {
    ensureQueue();
    setQueue(enqueueRemove(queue, entryId));
    if (isLocalId(entryId)) remote = remote.filter((e) => e.id !== entryId);
    publish(syncLine(state.profileId));
    await flush();
  },

  async reset(): Promise<void> {
    ensureQueue();
    let next = queue;
    for (const e of state.entries) next = enqueueRemove(next, e.id);
    setQueue(next);
    publish(syncLine(state.profileId));
    await flush();
  },

  /** Re-read from the database without showing a spinner (e.g. after another tab wrote). */
  refresh(): Promise<void> | undefined {
    const id = state.profileId;
    return id ? load(id, { silent: true }) : undefined;
  },

  /** Try the outbox again now (e.g. a "retry" tap). */
  retry(): Promise<void> {
    return flush();
  },
};

const SERVER_SNAPSHOT: MoodRecordState = {
  loading: true,
  entries: [],
  profileId: null,
  authError: null,
  sync: { state: "loading", message: "Checking your account…", signedIn: false, pending: 0 },
};
