/**
 * Habit photo icons — the deterministic load state (Wave 1).
 *
 * A habit with an uploaded photo used to flip between the photo and its
 * letter monogram across loads: the tile rendered the <img>, and a single
 * transient decode error (a multi-megabyte data URL is exactly the kind
 * of image a browser occasionally fails on a cold load) swapped in the
 * monogram for the rest of the session. Whether you saw your photo
 * depended on which load you happened to get.
 *
 * The rule now: a URL that exists owns the tile. While it loads — and
 * while it is retried, up to HABIT_IMAGE_MAX_ATTEMPTS — the tile holds
 * its space quietly and the photo fades in when it is ready. The
 * monogram appears only when there is genuinely no photo, or when the
 * photo has failed every attempt (a terminal error: the data is gone or
 * corrupt, not merely slow). Same habit, same icon, every load.
 */

import { useState } from "react";

/** Total tries (first load + retries) before an error counts as terminal. */
export const HABIT_IMAGE_MAX_ATTEMPTS = 3;

export type HabitImagePhase = "pending" | "ready" | "failed";

export interface HabitImageState {
  src: string | null;
  /** 1-based attempt currently in flight. */
  attempt: number;
  phase: HabitImagePhase;
}

export type HabitImageEvent =
  { type: "load" } | { type: "error" } | { type: "src"; src: string | null };

export function initialHabitImageState(src: string | null): HabitImageState {
  return { src, attempt: 1, phase: src ? "pending" : "ready" };
}

/** Pure transition — the whole rule lives here so it can be pinned by tests. */
export function nextHabitImageState(
  state: HabitImageState,
  event: HabitImageEvent,
): HabitImageState {
  switch (event.type) {
    case "src":
      return event.src === state.src ? state : initialHabitImageState(event.src);
    case "load":
      /* Only a pending tile can become ready — a terminal failure is final. */
      return state.phase === "pending" ? { ...state, phase: "ready" } : state;
    case "error":
      if (state.phase !== "pending") return state;
      return state.attempt < HABIT_IMAGE_MAX_ATTEMPTS
        ? { ...state, attempt: state.attempt + 1 }
        : { ...state, phase: "failed" };
  }
}

/** The monogram may step in only on a terminal failure (or no photo at all). */
export function habitImageFailed(state: HabitImageState): boolean {
  return state.phase === "failed";
}

/**
 * The hook the tiles use. State resets synchronously when the URL changes
 * (the adjust-on-prop-change pattern), so a habit that gains a photo never
 * shows the previous state for a frame. Retrying is keyed by `attempt`:
 * the caller remounts the <img> with that key, which is what makes the
 * browser actually try the decode again.
 */
export function useHabitImage(src: string | null): {
  state: HabitImageState;
  onLoad: () => void;
  onError: () => void;
} {
  const [state, setState] = useState<HabitImageState>(() => initialHabitImageState(src));
  const [seenSrc, setSeenSrc] = useState(src);
  if (seenSrc !== src) {
    setSeenSrc(src);
    setState(initialHabitImageState(src));
  }
  return {
    state,
    onLoad: () => setState((s) => nextHabitImageState(s, { type: "load" })),
    onError: () => setState((s) => nextHabitImageState(s, { type: "error" })),
  };
}
