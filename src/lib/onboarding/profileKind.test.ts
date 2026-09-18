import { describe, expect, it } from "vitest";

import {
  DEFAULT_ONBOARDING,
  isAdmin,
  isCycleRoute,
  parseOnboarding,
  suggestedTrackers,
  tracksCycle,
  type OnboardingState,
} from "./profileKind";

const state = (over: Partial<OnboardingState> = {}): OnboardingState => ({
  ...DEFAULT_ONBOARDING,
  ...over,
});

describe("tracksCycle", () => {
  it("includes the cycle for someone who asked for it", () => {
    expect(tracksCycle(state({ kind: "cycle" }))).toBe(true);
  });

  it("hides it only for an explicit no", () => {
    expect(tracksCycle(state({ kind: "no-cycle" }))).toBe(false);
  });

  it("defaults to showing it when nobody said otherwise", () => {
    /* the safe direction: never hide a feature from someone who didn't opt out */
    expect(tracksCycle(state({ kind: "unspecified" }))).toBe(true);
    expect(tracksCycle(DEFAULT_ONBOARDING)).toBe(true);
  });
});

describe("parseOnboarding", () => {
  it("rejects anything that isn't an object", () => {
    for (const bad of [null, undefined, 3, "x", []]) {
      expect(parseOnboarding(bad)).toBeNull();
    }
  });

  it("reads a well-formed record", () => {
    const parsed = parseOnboarding({
      done: true,
      kind: "no-cycle",
      focus: ["sleep", "study"],
      name: "  Ada  ",
      at: "2026-09-08T00:00:00.000Z",
      admin: false,
    });
    expect(parsed).toEqual({
      done: true,
      kind: "no-cycle",
      /* A pre-change document has no `sex` field. It must come back as null
         rather than be inferred from `kind` — "no-cycle" is also what someone
         gets from "prefer not to say" plus an opt-out, and the two must stay
         distinguishable in Settings. */
      sex: null,
      focus: ["sleep", "study"],
      name: "Ada",
      at: "2026-09-08T00:00:00.000Z",
      admin: false,
    });
  });

  it("keeps the sex answer, and falls back to null on a bad one", () => {
    expect(parseOnboarding({ sex: "male", kind: "no-cycle" })?.sex).toBe("male");
    expect(parseOnboarding({ sex: "female", kind: "cycle" })?.sex).toBe("female");
    expect(parseOnboarding({ sex: "unspecified" })?.sex).toBe("unspecified");
    /* An unknown value is not coerced into one of the three — that would be
       the app inventing an answer the person never gave. */
    expect(parseOnboarding({ sex: "other" })?.sex).toBeNull();
    expect(parseOnboarding({ sex: "" })?.sex).toBeNull();
  });

  it("never infers a sex answer from the capability", () => {
    /* The case this guard exists for: capability says no-cycle, but nobody
       said why. The answer stays unknown. */
    const parsed = parseOnboarding({ done: true, kind: "no-cycle" });
    expect(parsed?.kind).toBe("no-cycle");
    expect(parsed?.sex).toBeNull();
  });

  it("falls back rather than throwing on junk fields", () => {
    const parsed = parseOnboarding({ kind: "banana", focus: ["sleep", "nope", 7], name: "   " });
    expect(parsed?.kind).toBe("unspecified");
    expect(parsed?.focus).toEqual(["sleep"]);
    expect(parsed?.name).toBeNull();
    expect(parsed?.done).toBe(false);
  });

  it("caps a very long name", () => {
    expect(parseOnboarding({ name: "x".repeat(200) })?.name).toHaveLength(48);
  });
});

describe("isCycleRoute", () => {
  it("matches the cycle pages and their children", () => {
    expect(isCycleRoute("/cycle")).toBe(true);
    expect(isCycleRoute("/cycle-classic")).toBe(true);
    expect(isCycleRoute("/cycle/settings")).toBe(true);
  });

  it("leaves everything else alone", () => {
    for (const r of ["/", "/coach", "/profile", "/cycles-of-the-moon"]) {
      expect(isCycleRoute(r)).toBe(false);
    }
  });
});

describe("suggestedTrackers", () => {
  it("maps a focus onto trackers worth switching on", () => {
    expect(suggestedTrackers(["sleep"])).toEqual(["sleep", "energy"]);
  });

  it("de-duplicates across overlapping focuses", () => {
    const out = suggestedTrackers(["sleep", "movement"]);
    expect(new Set(out).size).toBe(out.length);
    expect(out).toContain("energy");
  });

  it("suggests nothing when nothing was chosen", () => {
    expect(suggestedTrackers([])).toEqual([]);
    expect(suggestedTrackers(["habits"])).toEqual([]);
  });
});

describe("admin mode", () => {
  it("is off by default", () => {
    expect(isAdmin(DEFAULT_ONBOARDING)).toBe(false);
  });

  it("is on only for an explicit flag", () => {
    expect(isAdmin(state({ admin: true }))).toBe(true);
    expect(isAdmin(state({ admin: false }))).toBe(false);
  });

  it("survives a round trip through storage", () => {
    /* the bar that lets you leave admin mode depends on this persisting */
    const parsed = parseOnboarding({ done: true, admin: true, kind: "unspecified" });
    expect(parsed && isAdmin(parsed)).toBe(true);
  });

  it("is not implied by having finished setup", () => {
    const parsed = parseOnboarding({ done: true, kind: "cycle" });
    expect(parsed && isAdmin(parsed)).toBe(false);
  });
});
