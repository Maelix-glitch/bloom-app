/**
 * The capture session machine, pinned.
 *
 * The pins that matter are the honesty ones: a capture can never reach
 * `done` without passing through a ready estimate and an explicit
 * CONFIRMED carrying a real entry id; a failed analysis leaves a state
 * holding no estimate at all; and discarding a ready estimate destroys
 * the only thing that could have been confirmed.
 */
import { describe, expect, it } from "vitest";

import type { CoachPhotoEstimate } from "@/lib/nutrition/coachLog";

import {
  canConfirm,
  captureReducer,
  initialCaptureState,
  type CaptureState,
} from "./session";

const ESTIMATE: CoachPhotoEstimate = {
  name: "Chicken biryani",
  totals: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
};

function toAnalysing(): CaptureState {
  const chosen = captureReducer(initialCaptureState, {
    type: "PHOTO_CHOSEN",
    photoName: "lunch.jpg",
  });
  return captureReducer(chosen, { type: "ANALYSIS_STARTED" });
}

function toEstimateReady(): CaptureState {
  return captureReducer(toAnalysing(), { type: "ANALYSIS_SUCCEEDED", estimate: ESTIMATE });
}

describe("capture session — the happy path", () => {
  it("walks idle → photoChosen → analysing → estimateReady → done", () => {
    const chosen = captureReducer(initialCaptureState, {
      type: "PHOTO_CHOSEN",
      photoName: "lunch.jpg",
    });
    expect(chosen).toEqual({ status: "photoChosen", photoName: "lunch.jpg" });

    const analysing = captureReducer(chosen, { type: "ANALYSIS_STARTED" });
    expect(analysing).toEqual({ status: "analysing", photoName: "lunch.jpg" });

    const ready = captureReducer(analysing, { type: "ANALYSIS_SUCCEEDED", estimate: ESTIMATE });
    expect(ready.status).toBe("estimateReady");
    if (ready.status === "estimateReady") {
      /* The estimate is held exactly as analysed. */
      expect(ready.estimate).toEqual(ESTIMATE);
    }
    expect(canConfirm(ready)).toBe(true);

    const done = captureReducer(ready, { type: "CONFIRMED", entryId: "entry-1" });
    expect(done).toEqual({ status: "done", entryId: "entry-1" });
    expect(canConfirm(done)).toBe(false);
  });
});

describe("capture session — confirm-first, pinned", () => {
  it("CONFIRMED is a no-op from every state except estimateReady", () => {
    const states: CaptureState[] = [
      initialCaptureState,
      { status: "photoChosen", photoName: "lunch.jpg" },
      toAnalysing(),
      { status: "error", photoName: "lunch.jpg", reason: "timeout", retryable: true },
      { status: "done", entryId: "entry-0" },
    ];
    for (const state of states) {
      expect(captureReducer(state, { type: "CONFIRMED", entryId: "entry-1" })).toBe(state);
      expect(canConfirm(state)).toBe(false);
    }
  });

  it("CONFIRMED with an empty entry id is refused even from estimateReady", () => {
    const ready = toEstimateReady();
    expect(captureReducer(ready, { type: "CONFIRMED", entryId: "  " })).toBe(ready);
  });

  it("an analysis result arriving outside `analysing` is ignored", () => {
    expect(
      captureReducer(initialCaptureState, { type: "ANALYSIS_SUCCEEDED", estimate: ESTIMATE }),
    ).toBe(initialCaptureState);
    const chosen = captureReducer(initialCaptureState, {
      type: "PHOTO_CHOSEN",
      photoName: "lunch.jpg",
    });
    expect(captureReducer(chosen, { type: "ANALYSIS_SUCCEEDED", estimate: ESTIMATE })).toBe(chosen);
  });

  it("choosing a new photo supersedes a ready estimate for the old one", () => {
    const ready = toEstimateReady();
    const chosen = captureReducer(ready, { type: "PHOTO_CHOSEN", photoName: "dinner.jpg" });
    expect(chosen).toEqual({ status: "photoChosen", photoName: "dinner.jpg" });
    expect(canConfirm(chosen)).toBe(false);
  });
});

describe("capture session — failure is honest and holds nothing", () => {
  it("a failed analysis lands in error with the photo but no estimate", () => {
    const failed = captureReducer(toAnalysing(), { type: "ANALYSIS_FAILED", reason: "timeout" });
    expect(failed).toEqual({
      status: "error",
      photoName: "lunch.jpg",
      reason: "timeout",
      retryable: true,
    });
    expect(canConfirm(failed)).toBe(false);
    /* Nothing in the error state can be confirmed afterwards. */
    expect(captureReducer(failed, { type: "CONFIRMED", entryId: "entry-1" })).toBe(failed);
  });

  it("retry restarts analysis from a retryable error, and only from one", () => {
    const failed = captureReducer(toAnalysing(), { type: "ANALYSIS_FAILED", reason: "error" });
    expect(captureReducer(failed, { type: "ANALYSIS_STARTED" })).toEqual({
      status: "analysing",
      photoName: "lunch.jpg",
    });

    const refused = captureReducer(toAnalysing(), {
      type: "ANALYSIS_FAILED",
      reason: "premium_required",
    });
    expect(refused).toMatchObject({ status: "error", retryable: false });
    expect(captureReducer(refused, { type: "ANALYSIS_STARTED" })).toBe(refused);

    const noCredits = captureReducer(toAnalysing(), {
      type: "ANALYSIS_FAILED",
      reason: "insufficient_credits",
    });
    expect(noCredits).toMatchObject({ status: "error", retryable: false });
  });

  it("a refused confirm write keeps the estimate and records the error", () => {
    const ready = toEstimateReady();
    const after = captureReducer(ready, { type: "LOG_FAILED", message: "too big" });
    expect(after.status).toBe("estimateReady");
    if (after.status === "estimateReady") {
      expect(after.estimate).toEqual(ESTIMATE);
      expect(after.saveError).toBe("too big");
    }
    /* …and a later successful confirm still completes the session. */
    expect(captureReducer(after, { type: "CONFIRMED", entryId: "entry-9" })).toEqual({
      status: "done",
      entryId: "entry-9",
    });
  });
});

describe("capture session — discard and reset", () => {
  it("discarding a ready estimate leaves an idle session with nothing to confirm", () => {
    const ready = toEstimateReady();
    const idle = captureReducer(ready, { type: "DISCARDED" });
    expect(idle).toEqual({ status: "idle" });
    expect(captureReducer(idle, { type: "CONFIRMED", entryId: "entry-1" })).toBe(idle);
  });

  it("RESET returns any state to idle; DISCARDED never un-logs a done session", () => {
    const done = captureReducer(toEstimateReady(), { type: "CONFIRMED", entryId: "entry-1" });
    expect(captureReducer(done, { type: "DISCARDED" })).toBe(done);
    expect(captureReducer(done, { type: "RESET" })).toEqual({ status: "idle" });
    expect(captureReducer(toAnalysing(), { type: "RESET" })).toEqual({ status: "idle" });
  });
});
