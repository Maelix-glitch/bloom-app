// @vitest-environment jsdom
/**
 * Trainer state — pinned: the strict parser, consent defaulting OFF,
 * a referral code that is created once and stable, the confirm-first
 * override semantics (proposing never confirms; dismissing stores
 * nothing), and the export/erasure inheritance every prefs key gets —
 * the same pins targetAdjustment.test.ts sets for its key.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { buildExport } from "@/lib/data/exportAll";
import { eraseDevice } from "@/lib/data/erase";
import { loadDoc } from "@/lib/prefs";

import {
  EMPTY_TRAINER_STATE,
  TRAINER_KEY,
  clearTrainerState,
  confirmPendingOverride,
  dismissPendingOverride,
  ensureReferralCode,
  parseTrainerState,
  proposeTargetOverride,
  readTrainerState,
  setShareConsent,
} from "./state";

const USER_ID = "104f6172-c166-46dd-9759-ced94379a2ea";
const PROPOSAL = {
  kcal: 2400,
  proteinG: 180,
  proposedBy: "Coach Arun",
  note: null,
  proposedAt: "2026-11-18T05:00:00.000Z",
};

beforeEach(() => {
  window.localStorage.clear();
  clearTrainerState();
});

describe("parseTrainerState", () => {
  it("accepts the empty state and rejects malformed values", () => {
    expect(parseTrainerState(EMPTY_TRAINER_STATE)).toEqual(EMPTY_TRAINER_STATE);
    expect(parseTrainerState(null)).toBeNull();
    expect(parseTrainerState({ ...EMPTY_TRAINER_STATE, version: 2 })).toBeNull();
    expect(parseTrainerState({ ...EMPTY_TRAINER_STATE, consentToShare: "yes" })).toBeNull();
    expect(parseTrainerState({ ...EMPTY_TRAINER_STATE, referralCode: "IO01IO01" })).toBeNull();
    expect(
      parseTrainerState({ ...EMPTY_TRAINER_STATE, pendingOverride: { kcal: 1 } }),
    ).toBeNull();
  });

  it("defaults to consent OFF with nothing proposed or confirmed", () => {
    expect(readTrainerState()).toEqual(EMPTY_TRAINER_STATE);
    expect(readTrainerState().consentToShare).toBe(false);
  });
});

describe("consent + referral code", () => {
  it("persists the consent toggle", () => {
    setShareConsent(true);
    expect(readTrainerState().consentToShare).toBe(true);
    setShareConsent(false);
    expect(readTrainerState().consentToShare).toBe(false);
  });

  it("creates the referral code once and keeps it stable", () => {
    const first = ensureReferralCode(USER_ID);
    expect(first).not.toBeNull();
    expect(ensureReferralCode(USER_ID)).toBe(first);
    expect(readTrainerState().referralCode).toBe(first);
    /* A different id never overwrites an existing code. */
    expect(ensureReferralCode("6cb9d835-7d57-4ab2-92c3-d92bd1f6c195")).toBe(first);
  });

  it("creates no code without an id", () => {
    expect(ensureReferralCode(null)).toBeNull();
    expect(readTrainerState().referralCode).toBeNull();
  });
});

describe("confirm-first override semantics", () => {
  it("proposing stores a PENDING proposal and confirms nothing", () => {
    const out = proposeTargetOverride(PROPOSAL, 100);
    expect(out.ok).toBe(true);
    const state = readTrainerState();
    expect(state.pendingOverride).toEqual({ ...PROPOSAL });
    expect(state.confirmedOverride).toBeNull();
  });

  it("an out-of-band proposal is refused and stores nothing", () => {
    const out = proposeTargetOverride({ ...PROPOSAL, kcal: 500 }, 100);
    expect(out.ok).toBe(false);
    expect(readTrainerState().pendingOverride).toBeNull();
  });

  it("confirming moves the pending proposal to the confirmed record, labelled", () => {
    proposeTargetOverride(PROPOSAL, 100);
    const confirmed = confirmPendingOverride("2026-11-18T06:00:00.000Z");
    expect(confirmed).toEqual({
      ...PROPOSAL,
      confirmedAt: "2026-11-18T06:00:00.000Z",
    });
    const state = readTrainerState();
    expect(state.pendingOverride).toBeNull();
    expect(state.confirmedOverride?.proposedBy).toBe("Coach Arun");
  });

  it("confirming with nothing pending confirms nothing", () => {
    expect(confirmPendingOverride("2026-11-18T06:00:00.000Z")).toBeNull();
    expect(readTrainerState().confirmedOverride).toBeNull();
  });

  it("dismissing a proposal stores nothing at all", () => {
    proposeTargetOverride(PROPOSAL, 100);
    dismissPendingOverride();
    const state = readTrainerState();
    expect(state.pendingOverride).toBeNull();
    expect(state.confirmedOverride).toBeNull();
  });

  it("a new proposal never disturbs a confirmed override", () => {
    proposeTargetOverride(PROPOSAL, 100);
    confirmPendingOverride("2026-11-18T06:00:00.000Z");
    proposeTargetOverride({ ...PROPOSAL, kcal: 2600 }, 100);
    const state = readTrainerState();
    expect(state.confirmedOverride?.kcal).toBe(2400);
    expect(state.pendingOverride?.kcal).toBe(2600);
  });
});

describe("export + erasure inheritance", () => {
  it("rides in the export bundle's prefs, verbatim", () => {
    setShareConsent(true);
    ensureReferralCode(USER_ID);
    const bundle = buildExport({ exportedAt: "2026-11-18T06:00:00.000Z", prefs: loadDoc() });
    const prefs = bundle.prefs as Record<string, { value: unknown }>;
    const value = prefs[TRAINER_KEY]?.value as { consentToShare?: boolean } | undefined;
    expect(value?.consentToShare).toBe(true);
  });

  it("the device erase removes the document that holds it", () => {
    setShareConsent(true);
    eraseDevice();
    expect(loadDoc()[TRAINER_KEY]).toBeUndefined();
    expect(readTrainerState()).toEqual(EMPTY_TRAINER_STATE);
  });
});
