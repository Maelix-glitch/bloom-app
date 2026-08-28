/**
 * useCycleSystem — session + cycle entries + derived model, all scoped to the
 * Cycle page. Mutations patch local state so hero, ring, calendar, analytics,
 * recommendations and the assistant context all refresh without a reload.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import { buildContext, buildCycleModel, localDateKey, normalizeEntry } from "@/lib/cycle/engine";
import { cycleStorage } from "@/lib/cycle/storage";
import type { CycleEntry, CycleModel } from "@/lib/cycle/types";

export type AuthState = "checking" | "signed-out" | "signed-in";

export function useCycleSystem() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [today, setToday] = useState<string | null>(null);

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
    if (authState !== "signed-in" || !userId || !today) return;
    let alive = true;
    setLoading(true);
    setError(null);
    void cycleStorage
      .all(userId)
      .then((rows) => alive && setEntries(rows))
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
    () => (today ? buildCycleModel(entries, today) : null),
    [entries, today],
  );

  const context = useMemo(() => (model ? buildContext(entries, model) : null), [entries, model]);

  const saveDay = useCallback(
    async (patch: Partial<CycleEntry> & { date: string }) => {
      if (!userId) throw new Error("Sign in first, and this saves for good.");
      const normalized = normalizeEntry(patch);
      await cycleStorage.save(userId, { ...normalized, logged_at: new Date().toISOString() });
      setEntries((prev) => {
        const without = prev.filter((e) => e.date !== normalized.date);
        return [...without, normalized].sort((a, b) => a.date.localeCompare(b.date));
      });
    },
    [userId],
  );

  const removeDay = useCallback(
    async (date: string) => {
      if (!userId) throw new Error("Sign in first.");
      await cycleStorage.remove(userId, date);
      setEntries((prev) => prev.filter((e) => e.date !== date));
    },
    [userId],
  );

  return {
    authState,
    userId,
    loading,
    error,
    entries,
    model,
    context,
    today: today ?? localDateKey(),
    refresh: () => setReload((r) => r + 1),
    saveDay,
    removeDay,
    sendMagicLink: async (email: string) => {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/cycle` },
      });
      return otpError
        ? { ok: false as const, message: "We couldn't send that link just now." }
        : { ok: true as const, message: "Check your inbox — a sign-in link is on its way." };
    },
  };
}
