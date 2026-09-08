/**
 * The onboarding answer, as state.
 *
 * Device-first like everything else: the answer is readable before any network
 * call, and it rides the synced prefs document so a second device doesn't ask
 * again.
 *
 * Reads go through `usePrefValue`, which caches at module level. That matters
 * because `AppNav` is mounted per-route: with a plain useState/useEffect pair,
 * every tab change would re-run "default, paint, correct" and flash the cycle
 * nav entry at someone who had turned it off. With the cache, the second and
 * every later mount has the real answer during render.
 */

import { useCallback } from "react";

import { setPref } from "@/lib/prefs";
import { usePrefValue } from "@/lib/prefsStore";
import {
  DEFAULT_ONBOARDING,
  ONBOARDING_PREF,
  parseOnboarding,
  tracksCycle,
  type FocusArea,
  type OnboardingState,
  type ProfileKind,
} from "@/lib/onboarding/profileKind";

export interface OnboardingStore {
  state: OnboardingState;
  /**
   * False only during the server render and the hydration pass. Distinct from
   * "has an answer" — see `needsWelcome`.
   */
  hydrated: boolean;
  /** True when the welcome flow should be shown. */
  needsWelcome: boolean;
  /** Does this person's Bloom include the cycle? */
  cycle: boolean;
  finish: (answer: { kind: ProfileKind; focus: FocusArea[]; name?: string | null }) => void;
  /** The admin door: everything on, nothing asked. */
  skipAsAdmin: () => void;
  /** Change the answer later, from settings. */
  setKind: (kind: ProfileKind) => void;
  /** Ask again from the beginning. */
  reset: () => void;
}

/**
 * A sentinel distinct from `DEFAULT_ONBOARDING`, so the hook can tell "the
 * server hasn't read storage" apart from "storage says nobody has answered".
 * Only the second should open the welcome flow.
 */
const UNREAD: OnboardingState = { ...DEFAULT_ONBOARDING, at: "__unread__" };

export function useOnboarding(): OnboardingStore {
  const state = usePrefValue<OnboardingState>(ONBOARDING_PREF, parseOnboarding, UNREAD);
  const hydrated = state.at !== "__unread__";

  const write = useCallback((next: OnboardingState) => {
    /* setPref fires PREFS_CHANGED, which invalidates the cache and re-renders
       every subscriber — no local setState needed. */
    setPref(ONBOARDING_PREF, next);
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
    (kind: ProfileKind) => write({ ...state, kind, at: new Date().toISOString() }),
    [write, state],
  );

  const reset = useCallback(() => write({ ...DEFAULT_ONBOARDING }), [write]);

  return {
    state,
    hydrated,
    /* Never on the server pass — the welcome screen must not be in the HTML. */
    needsWelcome: hydrated && !state.done,
    cycle: tracksCycle(state),
    finish,
    skipAsAdmin,
    setKind,
    reset,
  };
}
