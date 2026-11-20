import { describe, expect, it } from "vitest";

import {
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY } from "./data/dishLibrary";
import type { Dish } from "./dishes";
import {
  generatePlan,
  parsePlanValue,
  planInputsSnapshotOf,
  planStaleness,
  planValueOf,
  type DailyPlan,
  type SnackPlacement,
} from "./plan";
import {
  DEFAULT_SNACK_PLACEMENT,
  parseSnackPlacement,
} from "./snackPlacement";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food } from "./types";

/**
 * Method 14 (M-161) — the snack-placement preference. Until now
 * the snack's place in the day was the composer's alone to
 * decide (the widest-gap rule, P12). The person can now choose:
 * the widest gap (the default — the rule unchanged, bit-for-bit)
 * or the morning. The choice is a generation input, recorded on
 * the plan's inputs snapshot like the usual sleep times beside
 * it, so it composes, stores, round-trips and goes stale by name
 * exactly as they do. These pins hold that contract.
 *
 * A note on the morning label: the label logic names a snack by
 * its clock — before noon it is a "Mid-morning snack". There is
 * no "Morning snack" string in the engine; the preference's name
 * is the person's ("in the morning"), the label stays the
 * timeline's own word for the hour it lands at.
 */

const NOW = "2026-11-20T03:00:00.000Z";
const DAY = "2026-11-20";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

function fullProfile(mealsPerDay: number | null = 3): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(80, "kg"), PROVENANCE),
    goal: "maintain",
    activity: "moderate",
    rateKgPerWeek: 0,
    dietary: { ...EMPTY_DIETARY, pattern: "omnivore", mealsPerDay },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
    },
  };
}

function gen(
  opts: {
    wakeTime?: string | null;
    bedTime?: string | null;
    snackPlacement?: SnackPlacement;
    mealsPerDay?: number | null;
    dishes?: readonly Dish[];
    foods?: readonly Food[];
  } = {},
): DailyPlan {
  const profile = fullProfile(opts.mealsPerDay ?? 3);
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, DAY),
    fallbackTargets: null,
    foods: opts.foods ?? USDA_REFERENCE_FOODS,
    dishes: opts.dishes ?? DISH_LIBRARY,
    ...(opts.wakeTime !== undefined ? { wakeTime: opts.wakeTime } : {}),
    ...(opts.bedTime !== undefined ? { bedTime: opts.bedTime } : {}),
    ...(opts.snackPlacement !== undefined ? { snackPlacement: opts.snackPlacement } : {}),
    day: DAY,
    now: NOW,
    id: "plan-p14-snack",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

/** The owner's frame: up at 07:00, asleep at 23:00. */
const OWNER_FRAME = { wakeTime: "07:00", bedTime: "23:00" } as const;

const snackItem = (plan: DailyPlan) => plan.timeline!.items.find((i) => i.meal === "snack")!;

describe("method 14 · the snack on the owner's frame (07:00–23:00)", () => {
  it("the default is the widest gap, unchanged: 17:15, an evening snack", () => {
    const plan = gen(OWNER_FRAME);
    const snack = snackItem(plan);
    expect(snack.time).toBe("17:15");
    expect(snack.label).toBe("Evening snack");
    expect(plan.inputs.snackPlacement).toBe("widest_gap");
  });

  it("an explicit widest_gap composes the identical timeline", () => {
    const implicit = gen(OWNER_FRAME);
    const explicit = gen({ ...OWNER_FRAME, snackPlacement: "widest_gap" });
    expect(explicit.timeline).toEqual(implicit.timeline);
  });

  it("morning puts the snack between breakfast and lunch, named for its hour", () => {
    const plan = gen({ ...OWNER_FRAME, snackPlacement: "morning" });
    const items = plan.timeline!.items;
    const snack = snackItem(plan);
    /* The breakfast→lunch gap on this frame is 07:45 → 14:00;
       its midpoint is 10:52.5, which the timeline's five-minute
       grain rounds to 10:55 — comfortably ≥90 minutes from both
       neighbours. */
    expect(snack.time).toBe("10:55");
    expect(snack.label).toBe("Mid-morning snack");
    const idx = (meal: string) => items.findIndex((i) => i.meal === meal);
    expect(idx("breakfast")).toBeLessThan(idx("snack"));
    expect(idx("snack")).toBeLessThan(idx("lunch"));
    expect(plan.inputs.snackPlacement).toBe("morning");
    /* Nothing else about the day moves: the same meals, the same
       other times — only the snack's seat changed. */
    const byDefault = gen(OWNER_FRAME);
    for (const meal of ["breakfast", "lunch", "dinner"] as const) {
      expect(items.find((i) => i.meal === meal)!.time).toBe(
        byDefault.timeline!.items.find((i) => i.meal === meal)!.time,
      );
    }
  });

  it("morning falls back to the widest gap when the day has no breakfast→lunch gap", () => {
    /* A two-meal day composes lunch and dinner (the slot
       priority's first two) plus the added snack — there is no
       breakfast, so there is no morning gap to sit in. (On an
       anchored day with both meals placed, the gap always
       holds: the anchor refuses windows under nine hours, and
       at nine hours the gap is already 195 minutes.) The
       morning plan must then be the widest-gap plan, bit-for-bit:
       lunch on a breakfast-less day sits at 12:05, dinner at
       20:30, and the snack at that gap's midpoint, 16:20 — an
       afternoon snack. */
    const morning = gen({ ...OWNER_FRAME, snackPlacement: "morning", mealsPerDay: 2 });
    const byDefault = gen({ ...OWNER_FRAME, mealsPerDay: 2 });
    expect(morning.timeline).toEqual(byDefault.timeline);
    const snack = snackItem(morning);
    expect(snack.time).toBe("16:20");
    expect(snack.label).toBe("Afternoon snack");
  });
});

describe("method 14 · the preference itself", () => {
  it("the default is the widest gap", () => {
    expect(DEFAULT_SNACK_PLACEMENT).toBe("widest_gap");
  });

  it("the parser accepts exactly the two placements", () => {
    expect(parseSnackPlacement("widest_gap")).toBe("widest_gap");
    expect(parseSnackPlacement("morning")).toBe("morning");
    expect(parseSnackPlacement("teatime")).toBeNull();
    expect(parseSnackPlacement("")).toBeNull();
    expect(parseSnackPlacement(null)).toBeNull();
    expect(parseSnackPlacement(undefined)).toBeNull();
    expect(parseSnackPlacement(42)).toBeNull();
  });
});

describe("method 14 · storage and staleness", () => {
  it("the placement survives a storage round-trip", () => {
    const plan = gen({ ...OWNER_FRAME, snackPlacement: "morning" });
    const parsed = parsePlanValue(JSON.parse(JSON.stringify(planValueOf(plan))));
    expect(parsed).toEqual(plan);
    expect(parsed!.inputs.snackPlacement).toBe("morning");
  });

  it("a stored placement the engine never wrote refuses the plan whole", () => {
    const plan = gen(OWNER_FRAME);
    const raw = JSON.parse(JSON.stringify(planValueOf(plan)));
    raw.plan.inputs.snackPlacement = "teatime";
    expect(parsePlanValue(raw)).toBeNull();
  });

  it("a pre-P14 stored plan (no placement recorded) still parses — and reads as the default", () => {
    const plan = gen(OWNER_FRAME);
    const raw = JSON.parse(JSON.stringify(planValueOf(plan)));
    delete raw.plan.inputs.snackPlacement;
    const parsed = parsePlanValue(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.inputs.snackPlacement).toBeNull();
  });

  it("changing the placement names itself in the staleness check", () => {
    const plan = gen(OWNER_FRAME);
    const profile = fullProfile();
    const safety = classifySafety(toSafetyInput(profile));
    const current = {
      ...planInputsSnapshotOf(profile, safety, plan.targets),
      wakeTime: "07:00",
      bedTime: "23:00",
      snackPlacement: "morning" as const,
    };
    expect(planStaleness(plan, current).changed).toContain("where your snack sits");
  });

  it("an unchanged placement is silent — including for a pre-P14 plan", () => {
    const plan = gen(OWNER_FRAME);
    const profile = fullProfile();
    const safety = classifySafety(toSafetyInput(profile));
    const current = {
      ...planInputsSnapshotOf(profile, safety, plan.targets),
      wakeTime: "07:00",
      bedTime: "23:00",
      snackPlacement: "widest_gap" as const,
    };
    expect(planStaleness(plan, current).changed).not.toContain("where your snack sits");
    /* The pre-P14 shape: no placement on the stored plan at all. */
    const raw = JSON.parse(JSON.stringify(planValueOf(plan)));
    delete raw.plan.inputs.snackPlacement;
    const preP14 = parsePlanValue(raw)!;
    expect(planStaleness(preP14, current).changed).not.toContain("where your snack sits");
  });
});
