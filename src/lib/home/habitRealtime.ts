/**
 * A single Realtime channel for all `useHabits` consumers in one tab.
 *
 * Several screens compose hooks that use habits (the Today page, reminders,
 * profile records, and exports). Supabase reuses a channel by topic, so each
 * hook must not call `.on()` on its own copy: the second consumer would receive
 * the already-subscribed channel and Realtime would throw. Keep one channel,
 * fan changes out to every mounted consumer, and remove it only after the last
 * consumer leaves.
 */

import { supabase } from "@/lib/supabase";

type HabitChannel = ReturnType<typeof supabase.channel>;
type Listener = () => void;

type Entry = {
  channel: HabitChannel;
  listeners: Set<Listener>;
  refs: number;
  removeTimer: number | null;
};

const entries = new Map<string, Entry>();

function notify(entry: Entry): void {
  for (const listener of [...entry.listeners]) listener();
}

function release(profileId: string, listener: Listener): void {
  const entry = entries.get(profileId);
  if (!entry || !entry.listeners.delete(listener)) return;

  entry.refs -= 1;
  if (entry.refs > 0) return;

  // React Strict Mode mounts, cleans up, and mounts again in quick succession.
  // Give the next mount a chance to reuse this channel instead of tearing it
  // down while Supabase is still joining it.
  entry.removeTimer = window.setTimeout(() => {
    const current = entries.get(profileId);
    if (current !== entry || current.refs > 0) return;
    entries.delete(profileId);
    void supabase.removeChannel(entry.channel).catch(() => {
      // Realtime is best effort; local/REST data remains the source of truth.
    });
  }, 0);
}

/** Subscribe to habit-table changes without creating duplicate callbacks. */
export function subscribeToHabitChanges(profileId: string, listener: Listener): () => void {
  let entry = entries.get(profileId);

  if (entry) {
    if (entry.removeTimer !== null) {
      window.clearTimeout(entry.removeTimer);
      entry.removeTimer = null;
    }
    entry.listeners.add(listener);
    entry.refs += 1;
    return () => release(profileId, listener);
  }

  try {
    const channel = supabase
      .channel(`bloom-home-habits-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "habit_logs",
          filter: `profile_id=eq.${profileId}`,
        },
        () => {
          const current = entries.get(profileId);
          if (current) notify(current);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habits", filter: `profile_id=eq.${profileId}` },
        () => {
          const current = entries.get(profileId);
          if (current) notify(current);
        },
      )
      .subscribe();

    entry = { channel, listeners: new Set([listener]), refs: 1, removeTimer: null };
    entries.set(profileId, entry);
  } catch {
    // A realtime connection is an enhancement. REST and local storage keep
    // working when the project has no realtime service or the socket is blocked.
    return () => {};
  }

  return () => release(profileId, listener);
}

/** Test seam: tear down channels left by a test or a hot module reload. */
export async function resetHabitRealtime(): Promise<void> {
  const current = [...entries.values()];
  entries.clear();
  for (const entry of current) {
    if (entry.removeTimer !== null) window.clearTimeout(entry.removeTimer);
    await supabase.removeChannel(entry.channel).catch(() => undefined);
  }
}
