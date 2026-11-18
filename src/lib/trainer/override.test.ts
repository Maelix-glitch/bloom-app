/**
 * Trainer target proposals — pinned: the safety bands refuse at the
 * door (never clamp), the per-kilo check runs against the recorded
 * weight, and a proposal is shaped and labelled, never applied.
 */

import { describe, expect, it } from "vitest";

import {
  parseConfirmedTargetOverride,
  parseTargetOverrideProposal,
  validateTargetOverride,
} from "./override";

const RAW = {
  kcal: 2400,
  proteinG: 180,
  proposedBy: "Coach Arun",
  note: "Raise protein through the strength block.",
  proposedAt: "2026-11-18T05:00:00.000Z",
};

describe("validateTargetOverride", () => {
  it("accepts an in-band proposal and shapes it", () => {
    const out = validateTargetOverride(RAW, 100);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.proposal).toEqual({
        kcal: 2400,
        proteinG: 180,
        proposedBy: "Coach Arun",
        note: "Raise protein through the strength block.",
        proposedAt: RAW.proposedAt,
      });
    }
  });

  it("refuses calories outside the engine's 800–6000 band — no clamping", () => {
    expect(validateTargetOverride({ ...RAW, kcal: 799 }, 100).ok).toBe(false);
    expect(validateTargetOverride({ ...RAW, kcal: 6001 }, 100).ok).toBe(false);
    expect(validateTargetOverride({ ...RAW, kcal: 800 }, 100).ok).toBe(true);
    expect(validateTargetOverride({ ...RAW, kcal: 6000 }, 100).ok).toBe(true);
  });

  it("refuses protein outside the absolute sanity band", () => {
    expect(validateTargetOverride({ ...RAW, proteinG: 19 }, null).ok).toBe(false);
    expect(validateTargetOverride({ ...RAW, proteinG: 401 }, null).ok).toBe(false);
  });

  it("refuses protein outside 0.8–2.5 g/kg of the recorded weight", () => {
    /* 100 kg recorded: 260 g is 2.6 g/kg — outside. */
    expect(validateTargetOverride({ ...RAW, proteinG: 260 }, 100).ok).toBe(false);
    /* 50 g is 0.5 g/kg — outside. */
    expect(validateTargetOverride({ ...RAW, proteinG: 50 }, 100).ok).toBe(false);
    /* Without a recorded weight the per-kilo check is skipped, never guessed. */
    expect(validateTargetOverride({ ...RAW, proteinG: 260 }, null).ok).toBe(true);
  });

  it("refuses a proposal with no proposer or no valid date", () => {
    expect(validateTargetOverride({ ...RAW, proposedBy: "  " }, 100).ok).toBe(false);
    expect(validateTargetOverride({ ...RAW, proposedAt: "not a date" }, 100).ok).toBe(false);
    expect(validateTargetOverride(null, 100).ok).toBe(false);
    expect(validateTargetOverride("2400", 100).ok).toBe(false);
  });

  it("caps free text and treats a missing note as no note", () => {
    const out = validateTargetOverride(
      { ...RAW, proposedBy: "x".repeat(200), note: undefined },
      100,
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.proposal.proposedBy).toHaveLength(80);
      expect(out.proposal.note).toBeNull();
    }
  });
});

describe("stored-proposal parsers", () => {
  it("round-trips a proposal and a confirmed override", () => {
    expect(parseTargetOverrideProposal(RAW)).not.toBeNull();
    const confirmed = { ...RAW, confirmedAt: "2026-11-18T06:00:00.000Z" };
    expect(parseConfirmedTargetOverride(confirmed)?.confirmedAt).toBe(confirmed.confirmedAt);
  });

  it("rejects malformed stored values", () => {
    expect(parseTargetOverrideProposal({ ...RAW, kcal: 100 })).toBeNull();
    expect(parseConfirmedTargetOverride(RAW)).toBeNull();
    expect(parseConfirmedTargetOverride(null)).toBeNull();
  });
});
