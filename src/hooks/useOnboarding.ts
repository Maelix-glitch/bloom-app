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

import { useCallback, useEffect, useState } from "react";

import { setPref } from "@/lib/prefs";
import { usePrefValue } from "@/lib/prefsStore";
import {
  DEFAULT_ONBOARDING,
  ONBOARDING_PREF,
  WELCOME_VERSION,
  parseOnboarding,
  tracksCycle,
  welcomeRerunDue,
  type FocusArea,
  type OnboardingState,
  type ProfileKind,
  type SexAnswer,
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
  /**
   * True when a finished user is owed the current Welcome once more
   * (M-182): their record's version is behind `WELCOME_VERSION`.
   */
  needsWelcomeRerun: boolean;
  /**
   * The re-run's "Not now": stamp the current version as seen, changing
   * nothing else — the answers, and the time they were given, stand.
   */
  markWelcomeSeen: () => void;
  /** Does this person's Bloom include the cycle? */
  cycle: boolean;
  finish: (answer: {
    kind: ProfileKind;
    /** The question that produced `kind`, kept so Settings can show it. */
    sex?: SexAnswer;
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

/**
 * A sentinel distinct from `DEFAULT_ONBOARDING`, so the hook can tell "the
 * server hasn't read storage" apart from "storage says nobody has answered".
 * Only the second should open the welcome flow.
 */
const UNREAD: OnboardingState = { ...DEFAULT_ONBOARDING, at: "__unread__" };

export function useOnboarding(): OnboardingStore {
  const stored = usePrefValue<OnboardingState>(ONBOARDING_PREF, parseOnboarding, UNREAD);
  /* A first-run browser has no stored entry, so the client snapshot is the
     UNREAD fallback too — indistinguishable from "server hasn't read storage".
     Without this, a fresh user never hydrates and the welcome flow never
     opens. After mount, an absent entry means "nobody has answered": start
     from defaults (still UNREAD during SSR/hydration, so no markup flash). */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const state = mounted && stored.at === "__unread__" ? DEFAULT_ONBOARDING : stored;
  const hydrated = state.at !== "__unread__";

  const write = useCallback((next: OnboardingState) => {
    /* setPref fires PREFS_CHANGED, which invalidates the cache and re-renders
       every subscriber — no local setState needed. */
    setPref(ONBOARDING_PREF, next);
  }, []);

  const finish = useCallback<OnboardingStore["finish"]>(
    ({ kind, sex, focus, name }) =>
      write({
        done: true,
        kind,
        /* Omitted means "not asked" — stored as null rather than guessed from
           the capability. */
        sex: sex ?? null,
        focus,
        name: name?.trim() ? name.trim().slice(0, 48) : null,
        at: new Date().toISOString(),
        admin: false,
        /* Completing the flow is completing the CURRENT Welcome (M-182) —
           first run and re-run alike stamp the version they just saw. */
        welcomeVersion: WELCOME_VERSION,
      }),
    [write],
  );

  const skipAsAdmin = useCallback(
    () =>
      write({
        done: true,
        kind: "unspecified",
        /* The admin door asks nothing, so there is no answer to record. */
        sex: null,
        focus: [],
        name: null,
        at: new Date().toISOString(),
        admin: true,
        /* The door is a deliberate bypass of the current Welcome, so the
           record stamps it as seen — an admin is never owed a re-run. */
        welcomeVersion: WELCOME_VERSION,
      }),
    [write],
  );

  const markWelcomeSeen = useCallback(
    () =>
      /* The version stamp ONLY. `at` keeps the time the answers were
         given — "Not now" is not an answer, and must not impersonate
         one. The pref entry's own write stamp (setPref) is what makes
         the new version win across devices. */
      write({ ...state, welcomeVersion: WELCOME_VERSION }),
    [write, state],
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
    needsWelcomeRerun: hydrated && welcomeRerunDue(state),
    markWelcomeSeen,
    cycle: tracksCycle(state),
    finish,
    skipAsAdmin,
    setKind,
    reset,
  };
}
