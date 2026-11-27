/**
 * P6 acceptance: the plan learns from the logged days.
 *
 *   · No log (or too little, or an on-target log) → the plan is the
 *     P5 composer's, object for object.
 *   · A protein-shortfall log → the adaptation note leads the plan's
 *     notes with the log's real numbers, the anchors lean denser,
 *     and the day's protein lands closer to the (unchanged) target.
 *   · An energy-overshoot log → the energy top-ups stay out.
 *   · Targets, the inputs snapshot and the fingerprint never move:
 *     adaptation biases what is chosen, never what is aimed at.
 */

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
import { DISH_LIBRARY, findDish } from "./data/dishLibrary";
import { dishNutrients, type Dish } from "./dishes";
import { generatePlan, type DailyPlan } from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food, LogEntry } from "./types";

const NOW = "2026-11-17T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

/** The owner's shape (as planDishes.test.ts): eggetarian, 100 kg,
 *  gain. Since M-219 the safety questions are answered and the
 *  targets are the gated engine's — the body-profile fallback this
 *  fixture once rode is retired. */
function ownerProfile(): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(100, "kg"), PROVENANCE),
    goal: "gain",
    activity: "moderate",
    rateKgPerWeek: 0.25,
    dietary: { ...EMPTY_DIETARY, pattern: "eggetarian", mealsPerDay: 3, budgetTier: null },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
    },
  };
}

let seq = 0;
function entry(day: string, kcal: number, proteinG: number, meal: LogEntry["meal"] = "lunch"): LogEntry {
  seq += 1;
  return {
    id: `e-${seq}`,
    day,
    meal,
    foodId: null,
    snapshot: null,
    name: "logged",
    amount: { grams: 100 },
    nutrients: { kcal, proteinG, carbsG: 0, fatG: 0 },
    provenance: { kind: "user_entered", sourceId: "log-fixture", label: "Your value" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

/* A COMPLETE logged day (M-219): the day's totals split across a
   lunch and a dinner entry — the only shape the adaptation reads
   since the completeness gate. Totals preserved exactly. */
function dayEntries(day: string, kcal: number, proteinG: number): LogEntry[] {
  const kcalA = Math.round(kcal / 2);
  const proteinA = Math.round(proteinG / 2);
  return [
    entry(day, kcalA, proteinA, "lunch"),
    entry(day, kcal - kcalA, proteinG - proteinA, "dinner"),
  ];
}

function gen(
  profile: HealthProfile,
  opts: {
    day: string;
    foods?: readonly Food[];
    dishes?: readonly Dish[];
    /** Accepted for fixture compatibility and deliberately NOT
     *  forwarded: M-219 retired the fallback — targets come from
     *  the gated engine alone. */
    fallbackTargets?: { kcal: number; proteinG: number };
    recentLog?: readonly LogEntry[];
  },
): DailyPlan {
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, opts.day),
    foods: opts.foods ?? USDA_REFERENCE_FOODS,
    dishes: opts.dishes ?? DISH_LIBRARY,
    ...(opts.recentLog ? { recentLog: opts.recentLog } : {}),
    day: opts.day,
    now: NOW,
    id: "plan-p6",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

const dayTotals = (plan: DailyPlan) => ({
  kcal: plan.meals.reduce(
    (s, m) =>
      s +
      m.suggestions.reduce((a, x) => a + x.nutrients.kcal, 0) +
      m.dishes.reduce((a, x) => a + x.nutrients.kcal, 0),
    0,
  ),
  proteinG: plan.meals.reduce(
    (s, m) =>
      s +
      m.suggestions.reduce((a, x) => a + x.nutrients.proteinG, 0) +
      m.dishes.reduce((a, x) => a + x.nutrients.proteinG, 0),
    0,
  ),
});
const anchorIds = (plan: DailyPlan) =>
  plan.meals.map((m) => m.dishes.find((d) => d.role === "anchor")?.dishId ?? null);
/** Mean protein density (g per 100 kcal, per serving) of the plan's
 *  anchor dishes — the "denser anchors" the shortfall lean promises,
 *  measured on the dishes' own library panels. */
const meanAnchorDensity = (plan: DailyPlan) => {
  const anchors = plan.meals.flatMap((m) => m.dishes).filter((d) => d.role === "anchor");
  const densities = anchors.map((d) => {
    const per = dishNutrients(findDish(d.dishId)!).nutrients;
    return per.kcal > 0 ? (per.proteinG / per.kcal) * 100 : 0;
  });
  return densities.reduce((a, b) => a + b, 0) / densities.length;
};
const topUps = (plan: DailyPlan) =>
  plan.meals.flatMap((m) => m.suggestions.filter((s) => s.layer === "topup"));

const OWNER_DAY = "2026-11-18";
/** The gated engine's targets for the owner fixture (M-219):
 *  BMR 1,968 × 1.55 + 275 gain surplus = 3,325 kcal; protein on the
 *  healthy-ceiling reference weight, 72.6 kg × 1.6 = 116 g. */
const OWNER_TARGETS = { kcal: 3325, proteinG: 116 };
/** Three complete logged days averaging 70 g protein against the
 *  116 g guide — a shortfall under the M-219 targets. */
const SHORTFALL_LOG: LogEntry[] = [
  ...dayEntries("2026-11-15", 3000, 70),
  ...dayEntries("2026-11-16", 3100, 75),
  ...dayEntries("2026-11-17", 2900, 65),
];

describe("no usable log — the P5 plan, unchanged", () => {
  const base = gen(ownerProfile(), { day: OWNER_DAY, fallbackTargets: OWNER_TARGETS });

  it("no recentLog field at all", () => {
    /* Method 16 = the per-meal protein aim (M-244): the pin
       moves with the version; the behaviour pinned here — no log,
       no learning notes — is unchanged. */
    expect(base.methodVersion).toBe(16);
    expect(base.notes.some((n) => n.startsWith("From your log"))).toBe(false);
  });

  it("an empty log changes nothing", () => {
    const withEmpty = gen(ownerProfile(), {
      day: OWNER_DAY,
      fallbackTargets: OWNER_TARGETS,
      recentLog: [],
    });
    expect(withEmpty).toEqual(base);
  });

  it("a single logged day changes nothing", () => {
    const oneDay = gen(ownerProfile(), {
      day: OWNER_DAY,
      fallbackTargets: OWNER_TARGETS,
      recentLog: dayEntries("2026-11-17", 2900, 65),
    });
    expect(oneDay).toEqual(base);
  });

  it("an on-target log changes nothing", () => {
    const onTarget = gen(ownerProfile(), {
      day: OWNER_DAY,
      fallbackTargets: OWNER_TARGETS,
      recentLog: [...dayEntries("2026-11-16", 3300, 115), ...dayEntries("2026-11-17", 3350, 118)],
    });
    expect(onTarget).toEqual(base);
  });
});

describe("a protein-shortfall log", () => {
  const base = gen(ownerProfile(), { day: OWNER_DAY, fallbackTargets: OWNER_TARGETS });
  const biased = gen(ownerProfile(), {
    day: OWNER_DAY,
    fallbackTargets: OWNER_TARGETS,
    recentLog: SHORTFALL_LOG,
  });

  it("leads the notes with the adaptation, numbers from the log itself", () => {
    /* Brief v4 (Slice 1): notes[0] is the log-protein-shortfall
       reason's derived detail (reasons.ts) — same log numbers. */
    expect(biased.notes[0]).toBe(
      "Your last 3 logged days averaged 70 g protein against a 116 g target. Target unchanged.",
    );
  });

  it("never moves the targets, the snapshot or the fingerprint", () => {
    expect(biased.targets).toEqual(base.targets);
    expect(biased.targets).toEqual(OWNER_TARGETS);
    expect(biased.inputs).toEqual(base.inputs);
    expect(biased.fingerprint).toBe(base.fingerprint);
    for (const meal of biased.meals) {
      const baseMeal = base.meals.find((m) => m.meal === meal.meal)!;
      expect(meal.kcal).toBe(baseMeal.kcal);
      expect(meal.proteinG).toBe(baseMeal.proteinG);
    }
  });

  it("leans the composition measurably: denser anchors, protein met", () => {
    /* P8: the un-leaned composer already lands this day (220 g of
       the 220 g guide — the P7 composer's 201 g shortfall is the
       defect P8 fixed), so the lean is measured in WHAT is served,
       not in a rescued total: denser anchor dishes, and more
       protein on the day, still inside the 110% ceiling.
       P11 re-based the pin's DAY: on OWNER_DAY the un-leaned P11
       composer already crowns the density winners (the guaranteed
       snack reshaped the splits; the wider top-up pool changed the
       closing), so the lean has nothing left to move there.
       Measured across the surrounding week it still bites on
       several days; on 2026-11-23 the same shortfall log (the
       three days before it, averaging the same 120 g) swaps the
       breakfast anchor for a denser one and lifts the day from
       220 g to 237 g. The mechanism is what is pinned; the day is
       the one where it shows.
       P12 re-pin: the lifted total is now 231 g, not 237 g — on a
       protein-long day P12 buys the day's energy top-ups lean
       (least incidental protein first), so the same lean lands
       with less protein attached to its energy. The mechanism
       assertions below (denser anchors, more protein than the
       un-leaned day, inside the ceiling) are unchanged.
       Method 13 re-pin: the un-leaned day now lands at 221 g, not
       220 g, and the leaned day at 234 g, not 231 g — the snack
       slot serves a real dish (a shake) whose protein rides in
       the day's total where plain snack foods used to sit. The
       lean's lift and the ceiling below are unchanged.
       Method 14 re-pin: the un-leaned day lands at 223 g and the
       leaned day at 237 g — the lunch anchor (a creamy kulajda)
       is gravy-style, so its steamed-rice base rides in both
       days' totals, and the whole-plate judging moves the leaned
       day's breakfast anchor. The lift (+14 g) and the ceiling
       are unchanged.
       Method 15 re-pin (M-219): the fixture moved to a lose
       profile whose protein guide the composer must actually work
       for. At the owner fixture's M-219 targets (116 g) the
       un-leaned composer already lands 119–127 g every probed
       day — the old 220 g guide was unreachable, which is what
       made the lean visible there; at a reachable guide it has
       nothing left to rescue on that profile. On this profile
       (90 kg, 170 cm, lose; guide 1,632 kcal / 119 g) the
       un-leaned 2026-11-22 lands exactly on 119 g and the lean
       swaps anchors for denser ones and lifts the day to 124 g,
       inside the 110% ceiling. The mechanism assertions are
       unchanged.
       Protein Wave B re-pin (M-255, 2026-11-26): on 2026-11-22
       the un-leaned composer now lands at 129 g — wave B's
       Salisbury steak-style anchor entered the base picks — above
       the 119 g guide, so that day the lean has nothing left to
       rescue and base and leaned days coincide. The fixture day
       moves to 2026-11-25, same profile, same log: the un-leaned
       day lands at 123 g and the lean swaps the lunch and snack
       anchors for denser ones (wave A's chicken shawarma plate
       among them) and lifts the day to 126 g, inside the 110%
       ceiling. The mechanism assertions are unchanged. */
    const leanProfile: HealthProfile = {
      ...ownerProfile(),
      height: observation(quantity(170, "cm"), PROVENANCE),
      weight: observation(quantity(90, "kg"), PROVENANCE),
      goal: "lose",
      activity: "sedentary",
      rateKgPerWeek: 0.5,
      dietary: { ...EMPTY_DIETARY, pattern: "omnivore", mealsPerDay: 3, budgetTier: null },
    };
    const day = "2026-11-25";
    const log: LogEntry[] = [
      ...dayEntries("2026-11-19", 1500, 60),
      ...dayEntries("2026-11-20", 1550, 65),
      ...dayEntries("2026-11-21", 1450, 55),
    ];
    const baseDay = gen(leanProfile, { day, fallbackTargets: OWNER_TARGETS });
    const biasedDay = gen(leanProfile, {
      day,
      fallbackTargets: OWNER_TARGETS,
      recentLog: log,
    });
    expect(anchorIds(biasedDay)).not.toEqual(anchorIds(baseDay));
    expect(Math.round(dayTotals(baseDay).proteinG)).toBe(123);
    expect(Math.round(dayTotals(biasedDay).proteinG)).toBe(126);
    expect(dayTotals(biasedDay).proteinG).toBeGreaterThan(dayTotals(baseDay).proteinG);
    expect(dayTotals(biasedDay).proteinG).toBeLessThanOrEqual(1.1 * 119);
    expect(meanAnchorDensity(biasedDay)).toBeGreaterThan(meanAnchorDensity(baseDay));
  });
});

describe("an energy-overshoot log", () => {
  /* A dal-only dish pool: three light mains (~285 kcal each) leave a
     3,325 kcal day far under its guide, so the unbiased composer
     spends energy top-ups; the overshoot log must stop it. Protein
     (120 g logged vs the 116 g target) raises no protein signal.
     (M-219 re-base: the targets are the owner fixture's gated ones —
     the custom {2000, 40} pair this describe once injected through
     the retired fallback no longer exists as a path.) */
  const dishes = [
    findDish("dish-dal-fry")!,
    findDish("dish-moong-dal-tadka")!,
    findDish("dish-urad-dal")!,
  ];
  const overshootLog: LogEntry[] = [
    ...dayEntries("2026-11-16", 3800, 120),
    ...dayEntries("2026-11-17", 3800, 120),
  ];
  const base = gen(ownerProfile(), { day: OWNER_DAY, fallbackTargets: OWNER_TARGETS, dishes });
  const biased = gen(ownerProfile(), {
    day: OWNER_DAY,
    fallbackTargets: OWNER_TARGETS,
    dishes,
    recentLog: overshootLog,
  });

  it("the unbiased plan spends energy top-ups (the fixture bites)", () => {
    expect(topUps(base).length).toBeGreaterThan(0);
    expect(base.notes.some((n) => n.startsWith("From your log"))).toBe(false);
  });

  it("the overshoot plan leaves them out and says why, with the numbers", () => {
    /* M-219 re-pin: at the 116 g protein guide the dal pool leaves
       a protein gap the closing pass still fills — the two small
       Greek-yogurt top-ups (61 + 31 kcal) are protein closers, not
       energy top-ups. What the overshoot removes is the ENERGY
       spend: every remaining top-up is ≤100 kcal and the day lands
       ~770 kcal under the unbiased day. */
    expect(topUps(biased).length).toBeGreaterThan(0);
    expect(topUps(biased).every((s) => s.nutrients.kcal <= 100)).toBe(true);
    expect(dayTotals(biased).kcal).toBeLessThan(dayTotals(base).kcal);
    /* Brief v4 (Slice 1): the log-energy-overshoot reason's derived
       detail (reasons.ts) — same log numbers. */
    expect(biased.notes[0]).toBe(
      "Your last 2 logged days averaged 3,800 kcal against a 3,325 kcal target, so energy top-ups stay out.",
    );
    expect(biased.targets).toEqual(OWNER_TARGETS);
  });
});
