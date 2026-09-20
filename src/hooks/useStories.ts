/**
 * useStories — active + archived stories for one user, with seen state.
 * Loads independently, fails quietly, refreshes on demand and (best-effort)
 * over realtime. Seen state is local-first so rings update instantly.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { listMyStories } from "@/lib/profile/storyService";
import { subscribeToStoryChanges } from "@/lib/profile/storyRealtime";
import { isStoryActive, type Story } from "@/lib/profile/types";
import { seenStore } from "@/lib/stories/seen";

export function useStories(userId: string | null) {
  const [stories, setStories] = useState<Story[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seenTick, setSeenTick] = useState(0);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStories([]);
      return;
    }
    try {
      const rows = await listMyStories(userId);
      if (!alive.current) return;
      setStories(rows);
      setError(null);
    } catch (err) {
      if (!alive.current) return;
      setError(err instanceof Error ? err.message : "Couldn't read your stories.");
    }
  }, [userId]);

  useEffect(() => {
    alive.current = true;
    setStories(null);
    setError(null);
    void refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);

  /* rings update the moment anything marks a story seen */
  useEffect(() => seenStore.subscribe(() => setSeenTick((t) => t + 1)), []);

  /* realtime: new stories appear without a refresh (best-effort). The shared
     helper prevents duplicate hook instances from adding callbacks after the
     Supabase channel has subscribed. */
  useEffect(() => {
    if (!userId) return;
    return subscribeToStoryChanges(userId, () => void refresh());
  }, [userId, refresh]);

  const active = useMemo(() => (stories ?? []).filter((s) => isStoryActive(s)), [stories]);
  const archived = useMemo(() => (stories ?? []).filter((s) => !isStoryActive(s)), [stories]);

  const seenIds = useMemo(() => {
    void seenTick;
    return new Set(active.filter((s) => seenStore.has(s.id)).map((s) => s.id));
  }, [active, seenTick]);

  const markSeen = useCallback((story: Story) => {
    seenStore.mark(story.id);
  }, []);

  return {
    status: stories === null ? ("loading" as const) : ("ready" as const),
    error,
    active,
    archived,
    all: stories ?? [],
    seenIds,
    unseenCount: active.filter((s) => !seenIds.has(s.id)).length,
    markSeen,
    refresh,
  };
}
