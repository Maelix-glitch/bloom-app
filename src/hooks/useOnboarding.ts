/**
 * The onboarding answer, as state.
 *
 * Device-first like everything else: the answer is readable before any network
 * call, and it rides the synced prefs document so a second device doesn't ask
 * again. `hydrated` exists so the app can avoid flashing the welcome screen at
 * someone who answered months ago (server render has no storage).
 */

import { useCallback, useEffect, useState } from "react";

import { getPref, PREFS_CHANGED, setPref } from "@/lib/prefs";
import {
  DEFAULT_ONBOARDING,
  ONBOARDING_PREF,
  parseOnboarding,
  tracksCycle,
  type FocusArea,
  type OnboardingState,
  type ProfileKind,
} from "@/lib/onboarding/profileKind";

const read = (): OnboardingState =>
  getPref<OnboardingState>(ONBOARDING_PREF, parseOnboarding, DEFAULT_ONBOARDING);

export interface OnboardingStore {
  state: OnboardingState;
  /** False until localStorage has been read. */
  hydrated: boolean;
  /** True when the welcome flow should be shown. */
  needsWelcome: boolean;
  /** Does this person's Bloom include the cycle? */
  cycle: boolean;
  finish: (answer: {
    kind: ProfileKind;
    focus: FocusArea[];
    name?: string | null;
  }) => void;
  /** The admin door: everything on, nothing asked. */
  skipAsAdmin: () => void;
  /** Change the answer later, from settings. */
  setKind: (kind: ProfileKind) => void;
  /** Ask again from the beginning. */
  reset: () => void;
}

export function useOnboarding(): OnboardingStore {
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setState(read());
    sync();
    setHydrated(true);
    window.addEventListener(PREFS_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PREFS_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const write = useCallback((next: OnboardingState) => {
    setPref(ONBOARDING_PREF, next);
    setState(next);
  }, []);

  const finish = useCallback<OnboardingStore["finish"]>(
    ({ kind, focus, name }) =>
      write({
        done: true,
        kind,
        focus,
        name: name?.trim() ? name.trim().slice(0, 48) : null,
        at: new Date().toISOString(),
        admin: false,
      }),
    [write],
  );

  const skipAsAdmin = useCallback(
    () =>
      write({
        done: true,
        kind: "unspecified",
        focus: [],
        name: null,
        at: new Date().toISOString(),
        admin: true,
      }),
    [write],
  );

  const setKind = useCallback(
    (kind: ProfileKind) => write({ ...read(), kind, at: new Date().toISOString() }),
    [write],
  );

  const reset = useCallback(() => write({ ...DEFAULT_ONBOARDING }), [write]);

  return {
    state,
    hydrated,
    needsWelcome: hydrated && !state.done,
    cycle: tracksCycle(state),
    finish,
    skipAsAdmin,
    setKind,
    reset,
  };
}
