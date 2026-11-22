import { describe, expect, it } from "vitest";

/**
 * memberBadgesOf is the ONE derivation behind every badge surface
 * (M-209, owner directive 2026-11-22), and its rules are the system's
 * honesty:
 *
 *   · One truth per badge. Trainer comes from the trainer_profiles
 *     row and nowhere else — a "trainer" string among the granted
 *     kinds is NOT a trainer badge (member_badges cannot even hold
 *     one; its check constraint is exactly ('founder','tester')).
 *   · Founder and Tester come from member_badges rows, granted only
 *     by the owner's service-role grant. Unknown values are ignored,
 *     never rendered as a plausible-looking badge.
 *   · Display order is fixed: founder, then trainer, then tester —
 *     whatever order the facts arrived in.
 *   · No facts, no badges: the empty list is what every surface
 *     renders as nothing at all.
 */

import { memberBadgesOf } from "./badges";

describe("memberBadgesOf", () => {
  it("derives nothing from no facts", () => {
    expect(memberBadgesOf({ hasTrainerRow: false, memberBadgeKinds: [] })).toEqual([]);
  });

  it("derives the trainer badge from the trainer row alone", () => {
    expect(memberBadgesOf({ hasTrainerRow: true, memberBadgeKinds: [] })).toEqual([
      { kind: "trainer", label: "Trainer" },
    ]);
  });

  it("derives founder and tester from their granted rows", () => {
    expect(memberBadgesOf({ hasTrainerRow: false, memberBadgeKinds: ["tester"] })).toEqual([
      { kind: "tester", label: "Tester" },
    ]);
    expect(memberBadgesOf({ hasTrainerRow: false, memberBadgeKinds: ["founder"] })).toEqual([
      { kind: "founder", label: "Founder" },
    ]);
  });

  it("orders founder, trainer, tester whatever the facts' order", () => {
    expect(
      memberBadgesOf({ hasTrainerRow: true, memberBadgeKinds: ["tester", "founder"] }),
    ).toEqual([
      { kind: "founder", label: "Founder" },
      { kind: "trainer", label: "Trainer" },
      { kind: "tester", label: "Tester" },
    ]);
  });

  it("never lets a granted-kind string stand in for the trainer row", () => {
    /* One truth per badge: even if a "trainer" value somehow arrived
       among the member_badges kinds, the trainer badge stays the
       trainer_profiles row's to give. */
    expect(memberBadgesOf({ hasTrainerRow: false, memberBadgeKinds: ["trainer"] })).toEqual([]);
  });

  it("ignores unknown kinds instead of rendering them", () => {
    expect(
      memberBadgesOf({ hasTrainerRow: false, memberBadgeKinds: ["admin", "", "FOUNDER"] }),
    ).toEqual([]);
  });

  it("deduplicates repeated kinds", () => {
    expect(
      memberBadgesOf({ hasTrainerRow: false, memberBadgeKinds: ["founder", "founder"] }),
    ).toEqual([{ kind: "founder", label: "Founder" }]);
  });
});
