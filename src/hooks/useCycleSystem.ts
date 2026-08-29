/**
 * useCycleSystem — session + cycle entries + derived model, all scoped to the
 * Cycle page. Mutations patch local state so hero, ring, calendar, analytics,
 * recommendations and the assistant context all refresh without a reload.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { buildContext, buildCycleModel, localDateKey, normalizeEntry } from "@/lib/cycle/engine";
import { cycleStorage } from "@/lib/cycle/storage";
import type { CycleEntry, CycleModel } from "@/lib/cycle/types";

export type AuthState = "checking" | "signed-out" | "signed-in";

/* Device-local store used when signed out — same "saved locally" behavior
 * the legacy cycle page had, so the whole page stays usable without an
 * account. Nothing is fabricated; it is the user's own browser data. */
const LOCAL_KEY = "bloom.cycle.entries.local";
const PREFS_KEY = "bloom.cycle.prefs.v1"; // user-set working length while personal history is absent

function readDefaultCycle(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const v = raw ? ((JSON.parse(raw) as { defaultCycle?: unknown }).defaultCycle ?? null) : null;
    return typeof v === "number" && v >= 20 && v <= 45 ? v : null;
  } catch {
    return null;
  }
}

function writeDefaultCycle(days: number | null): void {
  if (typeof window === "undefined") return;
  try {
    if (days === null) window.localStorage.removeItem(PREFS_KEY);
    else window.localStorage.setItem(PREFS_KEY, JSON.stringify({ defaultCycle: days }));
  } catch {
    /* prefs just won't persist this session */
  }
}

function readLocal(): CycleEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const rows = raw ? (JSON.parse(raw) as Partial<CycleEntry>[]) : [];
    return Array.isArray(rows)
      ? rows.map((r) => normalizeEntry(r as Partial<CycleEntry> & { date: string }))
      : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: CycleEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  } catch {
    /* private mode etc. — in-memory state still stands for the session */
  }
}

export function useCycleSystem() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [defaultCycle, setDefaultCycleState] = useState<number | null>(() => readDefaultCycle());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [today, setToday] = useState<string | null>(null);
  const entriesRef = useRef<CycleEntry[]>([]);

  // today flips after mount → no server/client hydration mismatch
  useEffect(() => setToday(localDateKey()), []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      setAuthState(uid ? "signed-in" : "signed-out");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      const uid = session?.user.id ?? null;
      setUserId(uid);
      setAuthState(uid ? "signed-in" : "signed-out");
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!today || authState === "checking") return;

    if (authState !== "signed-in" || !userId) {
      // signed out: read the device-local log — the page stays fully usable
      const local = readLocal();
      entriesRef.current = local;
      setEntries(local);
      setError(null);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);
    void cycleStorage
      .all(userId)
      .then((rows) => {
        if (!alive) return;
        entriesRef.current = rows;
        setEntries(rows);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Couldn't load your cycle record.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [authState, userId, reload, today]);

  const model: CycleModel | null = useMemo(
    () => (today ? buildCycleModel(entries, today, { defaultCycle }) : null),
    [entries, today, defaultCycle],
  );

  const setDefaultCycle = useCallback((days: number | null) => {
    writeDefaultCycle(days);
    setDefaultCycleState(days);
  }, []);

  const context = useMemo(() => (model ? buildContext(entries, model) : null), [entries, model]);

  const saveDay = useCallback(
    async (patch: Partial<CycleEntry> & { date: string }) => {
      const normalized = normalizeEntry({ ...patch, logged_at: new Date().toISOString() });
      const mergeInto = (prev: CycleEntry[]) =>
        [...prev.filter((e) => e.date !== normalized.date), normalized].sort((a, b) =>
          a.date.localeCompare(b.date),
        );

      if (!userId) {
        const next = mergeInto(entriesRef.current);
        entriesRef.current = next;
        writeLocal(next); // device-local, exactly like the legacy page's fallback
        setEntries(next);
        return;
      }
      await cycleStorage.save(userId, normalized);
      setEntries((prev) => {
        const next = mergeInto(prev);
        entriesRef.current = next;
        return next;
      });
    },
    [userId],
  );

  const removeDay = useCallback(
    async (date: string) => {
      if (!userId) {
        const next = entriesRef.current.filter((e) => e.date !== date);
        entriesRef.current = next;
        writeLocal(next);
        setEntries(next);
        return;
      }
      await cycleStorage.remove(userId, date);
      setEntries((prev) => {
        const next = prev.filter((e) => e.date !== date);
        entriesRef.current = next;
        return next;
      });
    },
    [userId],
  );

  return {
    authState,
    userId,
    defaultCycle,
    setDefaultCycle,
    localOnly: authState !== "signed-in",
    loading,
    error,
    entries,
    model,
    context,
    today: today ?? localDateKey(),
    refresh: () => setReload((r) => r + 1),
    saveDay,
    removeDay,
  };
}
