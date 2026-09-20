/**
 * Shares the stories Realtime channel between mounted story consumers.
 * Supabase reuses a channel by topic; adding `.on()` from a second hook after
 * the first hook subscribed throws. Realtime is an enhancement, so failures
 * stay quiet and the normal story fetch remains authoritative.
 */

import { supabase } from "@/lib/supabase";

type StoryChannel = ReturnType<typeof supabase.channel>;
type Listener = () => void;

type Entry = {
  channel: StoryChannel;
  listeners: Set<Listener>;
  refs: number;
  removeTimer: number | null;
};

const entries = new Map<string, Entry>();

function notify(entry: Entry): void {
  for (const listener of [...entry.listeners]) listener();
}

function release(userId: string, listener: Listener): void {
  const entry = entries.get(userId);
  if (!entry || !entry.listeners.delete(listener)) return;
  entry.refs -= 1;
  if (entry.refs > 0) return;

  entry.removeTimer = window.setTimeout(() => {
    const current = entries.get(userId);
    if (current !== entry || current.refs > 0) return;
    entries.delete(userId);
    void supabase.removeChannel(entry.channel).catch(() => undefined);
  }, 0);
}

export function subscribeToStoryChanges(userId: string, listener: Listener): () => void {
  let entry = entries.get(userId);
  if (entry) {
    if (entry.removeTimer !== null) {
      window.clearTimeout(entry.removeTimer);
      entry.removeTimer = null;
    }
    entry.listeners.add(listener);
    entry.refs += 1;
    return () => release(userId, listener);
  }

  try {
    const channel = supabase
      .channel(`stories:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stories", filter: `author_id=eq.${userId}` },
        () => {
          const current = entries.get(userId);
          if (current) notify(current);
        },
      )
      .subscribe();
    entry = { channel, listeners: new Set([listener]), refs: 1, removeTimer: null };
    entries.set(userId, entry);
  } catch {
    return () => {};
  }

  return () => release(userId, listener);
}
