/**
 * The Mood record — one in-memory copy of the signed-in user's entries,
 * shared by every screen that reads it (Today, /mood, /mood/intelligence,
 * Coach). Before this each `useMoodSystem()` fetched the whole table on
 * mount, and the auth client's INITIAL_SESSION event fetched it *again* a
 * moment later, flipping `loading` back on — which unmounted and remounted
 * the entire page (the "flicker") and made every navigation start from a
 * spinner (the "lag"). Now the first screen loads it, later screens open on
 * the cached copy instantly, and a save on one screen is visible on all of
 * them at once. Revalidation happens in the background without touching
 * `loading`.
 */
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { moodStorage } from "@/lib/mood/storage";
import type { MoodEntry } from "@/lib/mood/types";

export type MoodRecordState = {
  /** True only until the first read for the current user resolves. */
  loading: boolean;
  entries: MoodEntry[];
  profileId: string | null;
  authError: string | null;
};

const NO_CONFIG =
  "Bloom isn't connected to a database in this environment, so Mood entries can't be loaded here.";
const SIGNED_OUT = "Please sign in to Bloom before opening Mood Intelligence.";

let state: MoodRecordState = { loading: true, entries: [], profileId: null, authError: null };
const listeners = new Set<() => void>();
let started = false;
let inflight: Promise<void> | null = null;
let loadedFor: string | null = null;

function emit() {
  for (const l of listeners) l();
}

function set(patch: Partial<MoodRecordState>) {
  state = { ...state, ...patch };
  emit();
}

const byTime = (a: MoodEntry, b: MoodEntry) => a.timestamp.localeCompare(b.timestamp);

/** Fetch (or refresh) the record for `id`. Only the very first read shows `loading`. */
function load(id: string, { silent }: { silent: boolean }) {
  if (inflight) return inflight;
  if (!silent) set({ loading: true, authError: null });
  inflight = moodStorage
    .all(id)
    .then((rows) => {
      loadedFor = id;
      set({ entries: rows.sort(byTime), loading: false, authError: null });
    })
    .catch((error: unknown) => {
      console.error("Could not load mood entries:", error);
      set({
        loading: false,
        authError: error instanceof Error ? error.message : "Could not load your Mood record.",
      });
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function signedOut() {
  loadedFor = null;
  set({ profileId: null, entries: [], loading: false, authError: SIGNED_OUT });
}

/** Wire the store to auth once; idempotent, safe to call from every hook mount. */
function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  if (!hasSupabaseConfig) {
    set({ profileId: null, entries: [], loading: false, authError: NO_CONFIG });
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

  /** Insert or replace an entry; the change is optimistic and reconciled with the saved row. */
  async save(entry: MoodEntry): Promise<void> {
    const id = state.profileId;
    if (!id) {
      set({ authError: "Please sign in before saving a Mood entry." });
      return;
    }
    const before = state.entries;
    set({ entries: [...before.filter((e) => e.id !== entry.id), entry].sort(byTime) });
    try {
      const saved = await moodStorage.put(id, entry);
      set({
        entries: [
          ...state.entries.filter((e) => e.id !== entry.id && e.id !== saved.id),
          saved,
        ].sort(byTime),
        authError: null,
      });
    } catch (error) {
      console.error("Could not save mood entry:", error);
      set({
        entries: before,
        authError: error instanceof Error ? error.message : "Could not save your Mood entry.",
      });
    }
  },

  async remove(entryId: string): Promise<void> {
    const id = state.profileId;
    if (!id) return;
    const before = state.entries;
    set({ entries: before.filter((e) => e.id !== entryId) });
    try {
      await moodStorage.remove(id, entryId);
    } catch (error) {
      console.error("Could not delete mood entry:", error);
      set({
        entries: before,
        authError: error instanceof Error ? error.message : "Could not delete your Mood entry.",
      });
    }
  },

  async reset(): Promise<void> {
    const id = state.profileId;
    if (!id) return;
    const before = state.entries;
    set({ entries: [] });
    try {
      await Promise.all(before.map((e) => moodStorage.remove(id, e.id)));
    } catch (error) {
      console.error("Could not reset mood entries:", error);
      set({
        entries: before,
        authError: error instanceof Error ? error.message : "Could not reset your Mood record.",
      });
    }
  },

  /** Re-read from the database without showing a spinner (e.g. after another tab wrote). */
  refresh(): Promise<void> | undefined {
    const id = state.profileId;
    return id ? load(id, { silent: true }) : undefined;
  },
};

const SERVER_SNAPSHOT: MoodRecordState = {
  loading: true,
  entries: [],
  profileId: null,
  authError: null,
};
