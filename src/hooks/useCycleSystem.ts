/**
 * useCycleSystem — session + cycle entries + derived model, all scoped to the
 * Cycle page. Mutations patch local state so hero, ring, calendar, analytics,
 * recommendations and the assistant context all refresh without a reload.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import {
  buildContext,
  buildCycleModel,
  dayStateFor,
  localDateKey,
  normalizeEntry,
  validateCycleConsistency,
} from "@/lib/cycle/engine";
import { cycleStorage } from "@/lib/cycle/storage";
import type { CycleChange, CycleEntry, CycleModel } from "@/lib/cycle/types";

export type AuthState = "checking" | "signed-out" | "signed-in";

/* Device-local store used when signed out — same "saved locally" behavior
 * the legacy cycle page had, so the whole page stays usable without an
 * account. Nothing is fabricated; it is the user's own browser data. */
const LOCAL_KEY = "bloom.cycle.entries.local";
const PREFS_KEY = "bloom.cycle.prefs.v1"; // user-set working length while personal history is absent
const CHANGE_KEY = "bloom.cycle.changes.v1";

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

function readChanges(): CycleChange[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHANGE_KEY);
    const rows = raw ? (JSON.parse(raw) as CycleChange[]) : [];
    return Array.isArray(rows) ? rows.slice(0, 20) : [];
  } catch {
    return [];
  }
}

function writeChanges(rows: CycleChange[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHANGE_KEY, JSON.stringify(rows.slice(0, 20)));
  } catch {
    /* audit is best-effort; user entries remain authoritative */
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
  const [changes, setChanges] = useState<CycleChange[]>(() => readChanges());
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

  const context = useMemo(
    () => (model ? buildContext(entries, model, changes) : null),
    [entries, model, changes],
  );

  useEffect(() => {
    if (!model || import.meta.env.PROD) return;
    const issues = validateCycleConsistency(entries, model).filter((i) => i.severity === "warning");
    if (issues.length) console.warn("[bloom:cycle:consistency]", issues);
  }, [entries, model]);

  const saveDay = useCallback(
    async (patch: Partial<CycleEntry> & { date: string }) => {
      const now = new Date().toISOString();
      const beforeRows = entriesRef.current;
      const before = beforeRows.find((e) => e.date === patch.date) ?? null;
      const previousModel = buildCycleModel(beforeRows, today ?? localDateKey(), { defaultCycle });
      const previousEstimate = dayStateFor(patch.date, beforeRows, previousModel);
      const normalized = normalizeEntry({
        ...before,
        ...patch,
        logged_at: before?.logged_at ?? now,
        updated_at: now,
      });
      const mergeInto = (prev: CycleEntry[]) =>
        [...prev.filter((e) => e.date !== normalized.date), normalized].sort((a, b) =>
          a.date.localeCompare(b.date),
        );
      const recordChange = (next: CycleEntry[]) => {
        const nextModel = buildCycleModel(next, today ?? localDateKey(), { defaultCycle });
        const change: CycleChange = {
          id: `${now}-${normalized.date}`,
          at: now,
          date: normalized.date,
          kind: before ? "edit" : "add",
          before,
          after: normalized,
          message:
            normalized.flow && normalized.flow !== "none"
              ? `Logged bleeding for ${normalized.date}. Bloom adjusted the forecast from your latest entry.`
              : normalized.flow === "none"
                ? `Logged no bleeding for ${normalized.date}. Bloom adjusted the forecast from your latest entry.`
                : `Updated ${normalized.date}. Bloom refreshed the cycle view from what you logged.`,
          previousEstimate: {
            phase: previousEstimate.phase,
            bleedingState: previousEstimate.bleedingState,
            bleedingProvenance: previousEstimate.bleedingProvenance,
            reproductivePhase: previousEstimate.reproductivePhase,
            reproductiveProvenance: previousEstimate.reproductiveProvenance,
            provenance: previousEstimate.provenance,
          },
          forecastChanged:
            previousModel.events.find((e) => e.id === "next-period")?.date !==
            nextModel.events.find((e) => e.id === "next-period")?.date,
        };
        setChanges((prev) => {
          const out = [change, ...prev].slice(0, 20);
          writeChanges(out);
          return out;
        });
      };

      if (!userId) {
        const next = mergeInto(entriesRef.current);
        entriesRef.current = next;
        writeLocal(next); // device-local, exactly like the legacy page's fallback
        setEntries(next);
        recordChange(next);
        return;
      }
      await cycleStorage.save(userId, normalized);
      setEntries((prev) => {
        const next = mergeInto(prev);
        entriesRef.current = next;
        recordChange(next);
        return next;
      });
    },
    [userId, today, defaultCycle],
  );

  const removeDay = useCallback(
    async (date: string) => {
      const now = new Date().toISOString();
      const beforeRows = entriesRef.current;
      const before = beforeRows.find((e) => e.date === date) ?? null;
      const previousModel = buildCycleModel(beforeRows, today ?? localDateKey(), { defaultCycle });
      const previousNext = previousModel.events.find((e) => e.id === "next-period")?.date;
      const recordDelete = (next: CycleEntry[]) => {
        const nextModel = buildCycleModel(next, today ?? localDateKey(), { defaultCycle });
        const change: CycleChange = {
          id: `${now}-${date}-delete`,
          at: now,
          date,
          kind: "delete",
          before,
          after: null,
          message: `Removed the entry for ${date}. Bloom refreshed the forecast from the remaining logs.`,
          previousEstimate: null,
          forecastChanged:
            previousNext !== nextModel.events.find((e) => e.id === "next-period")?.date,
        };
        setChanges((prev) => {
          const out = [change, ...prev].slice(0, 20);
          writeChanges(out);
          return out;
        });
      };
      if (!userId) {
        const next = entriesRef.current.filter((e) => e.date !== date);
        entriesRef.current = next;
        writeLocal(next);
        setEntries(next);
        recordDelete(next);
        return;
      }
      await cycleStorage.remove(userId, date);
      setEntries((prev) => {
        const next = prev.filter((e) => e.date !== date);
        entriesRef.current = next;
        recordDelete(next);
        return next;
      });
    },
    [userId, today, defaultCycle],
  );

  const resetAll = useCallback(async () => {
    const now = new Date().toISOString();
    const beforeRows = entriesRef.current;
    if (userId) {
      await Promise.all(beforeRows.map((entry) => cycleStorage.remove(userId, entry.date)));
    }
    entriesRef.current = [];
    writeLocal([]);
    writeDefaultCycle(null);
    setDefaultCycleState(null);
    setEntries([]);
    const change: CycleChange = {
      id: `${now}-reset-all`,
      at: now,
      date: today ?? localDateKey(),
      kind: "delete",
      before: beforeRows[0] ?? null,
      after: null,
      message:
        "Reset cycle data. Logged entries were cleared and estimates returned to the baseline empty state.",
      previousEstimate: null,
      forecastChanged: beforeRows.length > 0,
    };
    const out = [change];
    writeChanges(out);
    setChanges(out);
  }, [userId, today]);

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
    changes,
    latestChange: changes[0] ?? null,
    today: today ?? localDateKey(),
    refresh: () => setReload((r) => r + 1),
    saveDay,
    removeDay,
    resetAll,
  };
}
