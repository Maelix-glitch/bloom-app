/**
 * Food Capture — the capture session state machine (SYSTEM 7).
 *
 * Capturing a meal photo in the Nutrition tab is a flow with one
 * inviolable rule, inherited from the Coach "Log this" handoff (§4.4):
 * **nothing is ever logged automatically.** A photo can be chosen and
 * analysed, but the analysis only ever produces a *proposal* — an
 * estimate held in this state — and the single transition that ends in
 * `done` is an explicit CONFIRMED carrying the id of an entry the
 * confirm write actually created. There is no path from a chosen photo
 * (or a finished analysis) to `done` that skips `estimateReady`, and no
 * event but CONFIRMED reaches `done` at all.
 *
 * This module is pure: it holds no File, writes nothing, and knows
 * nothing about the network. The component keeps the File, calls the
 * analysis adapter (analyse.ts) while the state is `analysing`, and
 * performs the confirm write (log.ts) before dispatching CONFIRMED.
 *
 * Failure is a state, not an exception: an analysis failure lands in
 * `error` holding the reason and the photo's name — but never an
 * estimate — so a failed capture has nothing in it that could be
 * confirmed. Billing refusals (credits out, Premium-only feature) are
 * marked non-retryable: asking again cannot change them, and the UI
 * must not offer a retry that pretends otherwise.
 */

import type { CoachPhotoEstimate } from "@/lib/nutrition/coachLog";

/** Why an analysis did not produce an estimate. Mirrors the edge
 *  client's refusal reasons plus the two capture-local ones. */
export type CaptureFailureReason =
  | "unreadable_photo"
  | "no_estimate"
  | "unconfigured"
  | "timeout"
  | "error"
  | "aborted"
  | "insufficient_credits"
  | "premium_required";

/** Reasons a person can act on by simply asking again. */
const RETRYABLE: ReadonlySet<CaptureFailureReason> = new Set([
  "timeout",
  "error",
  "no_estimate",
]);

export type CaptureState =
  | { status: "idle" }
  | { status: "photoChosen"; photoName: string }
  | { status: "analysing"; photoName: string }
  | {
      status: "estimateReady";
      photoName: string;
      /** The estimate exactly as the analysis returned it. The confirm
       *  form may edit its own copies; this one never changes. */
      estimate: CoachPhotoEstimate;
      /** Set when a confirm write was refused (numbers beyond the
       *  entry caps) — the estimate survives so the person can adjust
       *  and confirm again. */
      saveError?: string;
    }
  | {
      status: "error";
      /** The photo survives a retryable failure so Retry needs no
       *  re-pick; null when no readable photo ever existed. */
      photoName: string | null;
      reason: CaptureFailureReason;
      retryable: boolean;
    }
  | { status: "done"; entryId: string };

export type CaptureEvent =
  | { type: "PHOTO_CHOSEN"; photoName: string }
  | { type: "ANALYSIS_STARTED" }
  | { type: "ANALYSIS_SUCCEEDED"; estimate: CoachPhotoEstimate }
  | { type: "ANALYSIS_FAILED"; reason: CaptureFailureReason }
  | { type: "LOG_FAILED"; message: string }
  | { type: "CONFIRMED"; entryId: string }
  | { type: "DISCARDED" }
  | { type: "RESET" };

export const initialCaptureState: CaptureState = { status: "idle" };

/** The one question the UI asks before enabling its confirm button. */
export function canConfirm(state: CaptureState): boolean {
  return state.status === "estimateReady";
}

export function captureReducer(state: CaptureState, event: CaptureEvent): CaptureState {
  switch (event.type) {
    case "PHOTO_CHOSEN": {
      /* A new photo supersedes anything short of a finished log: a
         stale estimate for a previous photo must never be confirmable
         against the new one. From `done`, a new capture starts only
         after RESET (the sheet closes and reopens instead). */
      if (state.status === "done") return state;
      if (event.photoName.trim() === "") return state;
      return { status: "photoChosen", photoName: event.photoName };
    }
    case "ANALYSIS_STARTED": {
      if (state.status === "photoChosen") {
        return { status: "analysing", photoName: state.photoName };
      }
      /* Retry: only from a retryable error that still holds a photo. */
      if (state.status === "error" && state.retryable && state.photoName !== null) {
        return { status: "analysing", photoName: state.photoName };
      }
      return state;
    }
    case "ANALYSIS_SUCCEEDED": {
      if (state.status !== "analysing") return state;
      return { status: "estimateReady", photoName: state.photoName, estimate: event.estimate };
    }
    case "ANALYSIS_FAILED": {
      if (state.status !== "analysing") return state;
      /* The error state is built from the photo alone — the failed
         analysis contributes nothing, so there is no estimate in it
         to confirm, now or later. */
      return {
        status: "error",
        photoName: state.photoName,
        reason: event.reason,
        retryable: RETRYABLE.has(event.reason),
      };
    }
    case "LOG_FAILED": {
      if (state.status !== "estimateReady") return state;
      return { ...state, saveError: event.message };
    }
    case "CONFIRMED": {
      /* Confirm-first, pinned: only a ready estimate can be confirmed,
         and only with the id of an entry the write actually made. */
      if (state.status !== "estimateReady") return state;
      if (event.entryId.trim() === "") return state;
      return { status: "done", entryId: event.entryId };
    }
    case "DISCARDED": {
      /* Discarding drops the estimate with the state — after this the
         session holds nothing confirmable. */
      if (state.status === "done") return state;
      return { status: "idle" };
    }
    case "RESET": {
      return { status: "idle" };
    }
  }
}
