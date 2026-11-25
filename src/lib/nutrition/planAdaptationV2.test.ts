/**
 * P7 acceptance: the plan learns the person.
 *
 *   · No usable learning (no log, an on-target log with no dish
 *     history) → the plan is the P6 composer's, object for object.
 *   · Dishes the person logs repeatedly lead the picks, and the
 *     note says so with the counts.
 *   · A dish the last completed plan served that the log never took
 *     up sits out — and without the stored plan, that signal does
 *     not exist.
 *   · A logged week running short of a micronutrient favours dishes
 *     whose computed panels are rich in it, named with the real
 *     average and the reference.
 *   · Targets and the fingerprint never move for any of it.
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
import { createDishEntry } from "./dishLog";
import { generatePlan, type DailyPlan } from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food, LogEntry } from "./types";

const NOW = "2026-11-18T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;
const OWNER_DAY = "2026-11-18";
/** The gated engine's targets for the owner fixture (M-219):
 *  3,325 kcal / 116 g protein. */
const OWNER_TARGETS = { kcal: 3325, proteinG: 116 };

/** The owner's shape (as planLearning.test.ts): eggetarian, 100 kg,
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
function foodEntry(
  day: string,
  nutrients: LogEntry["nutrients"],
  meal: LogEntry["meal"] = "lunch",
): LogEntry {
  seq += 1;
  return {
    id: `e-${seq}`,
    day,
    meal,
    foodId: null,
    snapshot: null,
    name: "logged",
    amount: { grams: 100 },
    nutrients,
    provenance: { kind: "user_entered", sourceId: "fixture", label: "Your value" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

/* A COMPLETE logged day (M-219): the day's nutrients split across
   a lunch and a dinner entry — the only shape the adaptation
   reads since the completeness gate. Totals preserved exactly. */
function dayEntries(day: string, nutrients: LogEntry["nutrients"]): LogEntry[] {
  const half = (v: number | undefined) => (v === undefined ? undefined : Math.round(v / 2));
  const split = (meal: LogEntry["meal"], rest: boolean): LogEntry =>
    foodEntry(
      day,
      {
        kcal: rest ? nutrients.kcal - (half(nutrients.kcal) ?? 0) : (half(nutrients.kcal) ?? 0),
        proteinG: rest
          ? nutrients.proteinG - (half(nutrients.proteinG) ?? 0)
          : (half(nutrients.proteinG) ?? 0),
        carbsG: 0,
        fatG: 0,
        ...(nutrients.ironMg !== undefined
          ? { ironMg: rest ? nutrients.ironMg - (half(nutrients.ironMg) ?? 0) : (half(nutrients.ironMg) ?? 0) }
          : {}),
      },
      meal,
    );
  return [split("lunch", false), split("dinner", true)];
}

function dishEntry(day: string, dishId: string, meal: LogEntry["meal"] = "lunch"): LogEntry {
  const dish = findDish(dishId);
  if (!dish) throw new Error(`unknown dish ${dishId}`);
  const entry = createDishEntry({ dish, meal, day, now: `${day}T12:00:00.000Z` });
  if (!entry) throw new Error(`dish entry refused for ${dishId}`);
  return entry;
}

function gen(opts: {
  day: string;
  recentLog?: readonly LogEntry[];
  storedPlan?: DailyPlan | null;
}): DailyPlan {
  const profile = ownerProfile();
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, opts.day),
    foods: USDA_REFERENCE_FOODS as readonly Food[],
    dishes: DISH_LIBRARY,
    ...(opts.recentLog ? { recentLog: opts.recentLog } : {}),
    ...(opts.storedPlan !== undefined ? { storedPlan: opts.storedPlan } : {}),
    day: opts.day,
    now: NOW,
    id: "plan-p7",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

const anchorsOf = (plan: DailyPlan) =>
  plan.meals.map((m) => m.dishes.find((d) => d.role === "anchor")?.dishId ?? null);
const dishIdsOf = (plan: DailyPlan) => plan.meals.flatMap((m) => m.dishes.map((d) => d.dishId));

describe("no usable learning — the P6 plan, unchanged", () => {
  it("an empty log and no stored plan change nothing", () => {
    const base = gen({ day: OWNER_DAY });
    const withEmpty = gen({ day: OWNER_DAY, recentLog: [], storedPlan: null });
    expect(withEmpty).toEqual(base);
    /* Method 16 = the per-meal protein aim (M-244): version pin
       moved; the inertness pinned here is unchanged. */
    expect(base.methodVersion).toBe(16);
  });

  it("an on-target log with no dish history changes nothing", () => {
    const base = gen({ day: OWNER_DAY });
    const onTarget = gen({
      day: OWNER_DAY,
      recentLog: [
        ...dayEntries("2026-11-16", { kcal: 3300, proteinG: 115, carbsG: 0, fatG: 0 }),
        ...dayEntries("2026-11-17", { kcal: 3350, proteinG: 118, carbsG: 0, fatG: 0 }),
      ],
    });
    expect(onTarget.meals).toEqual(base.meals);
    expect(onTarget.notes).toEqual(base.notes);
  });
});

describe("behavioural learning", () => {
  /* Two eggetarian anchors the owner-fixture pool serves, each
     logged three times in the window.
     M-219 re-pick: the pair was two tempeh dishes, chosen when
     the 220 g protein guide made dense tempeh anchors fit the
     day's splits. At the gated 116 g guide they no longer fit —
     and the P7 bias is a near-tie term by design (−0.08), so it
     cannot crown a dish that fits badly; the reason fired but
     nothing served. The contract is unchanged; the pair is now
     two dishes that fit this profile's splits (both anchor
     un-biased days in the same week). */
  const FAVOURED = ["dish-kaju-masala", "dish-intl-lentil-walnut-meatballs"];
  const favouredLog: LogEntry[] = [
    dishEntry("2026-11-10", FAVOURED[0]!),
    dishEntry("2026-11-12", FAVOURED[1]!),
    dishEntry("2026-11-13", FAVOURED[0]!),
    dishEntry("2026-11-15", FAVOURED[1]!),
    dishEntry("2026-11-16", FAVOURED[0]!),
    dishEntry("2026-11-17", FAVOURED[1]!),
  ];

  it("dishes the person returns to lead the picks, named with counts", () => {
    const plan = gen({ day: OWNER_DAY, recentLog: favouredLog });
    const anchors = anchorsOf(plan);
    expect(anchors.some((a) => a !== null && FAVOURED.includes(a))).toBe(true);
    expect(dishIdsOf(plan).some((id) => FAVOURED.includes(id))).toBe(true);
    /* Brief v4 (Slice 1): the naming is the favoured-dishes reason;
       its derived detail leads with the same fact and counts. */
    expect(plan.reasons?.some((r) => r.kind === "favoured-dishes")).toBe(true);
    expect(
      plan.notes.some((n) => n.startsWith("Dishes you return to lead this plan")),
    ).toBe(true);
    expect(plan.notes.some((n) => n.includes("(logged 3 times)"))).toBe(true);
    /* The learning never moves the aim. */
    expect(plan.targets).toEqual(OWNER_TARGETS);
  });

  it("a dish the last completed plan served, never logged, sits out", () => {
    const yesterday = gen({ day: "2026-11-17" });
    const servedAnchor = anchorsOf(yesterday).find((a) => a !== null)!;
    /* The day's log takes up other dishes, never the served anchor. */
    const log: LogEntry[] = [
      dishEntry("2026-11-17", "dish-intl-menemen"),
      dishEntry("2026-11-16", "dish-intl-menemen"),
    ];
    const withMemory = gen({ day: OWNER_DAY, recentLog: log, storedPlan: yesterday });
    expect(anchorsOf(withMemory)).not.toContain(servedAnchor);
    expect(
      withMemory.notes.some(
        (n) =>
          n.includes("were in your 2026-11-17 plan") || n.includes("was in your 2026-11-17 plan"),
      ),
    ).toBe(true);
    /* Without the stored plan the signal does not exist. */
    const withoutMemory = gen({ day: OWNER_DAY, recentLog: log });
    expect(withoutMemory.notes.some((n) => n.includes("2026-11-17 plan"))).toBe(false);
  });
});

describe("micronutrient gap closing", () => {
  /* Seven complete logged days, each reporting just 2 mg of
     iron — a persistent gap against the 19 mg reference (male).
     (M-219: each day is split across lunch and dinner so the
     completeness gate reads it; the day totals are unchanged.) */
  const ironPoorLog: LogEntry[] = [
    "2026-11-11",
    "2026-11-12",
    "2026-11-13",
    "2026-11-14",
    "2026-11-15",
    "2026-11-16",
    "2026-11-17",
  ].flatMap((day) =>
    dayEntries(day, { kcal: 2400, proteinG: 160, carbsG: 0, fatG: 0, ironMg: 2 }),
  );

  it("the note names the nutrient, the average and the reference", () => {
    const plan = gen({ day: OWNER_DAY, recentLog: ironPoorLog });
    const note = plan.notes.find((n) => n.includes("iron"));
    expect(note).toBeDefined();
    expect(note).toContain("averaged 2 mg a day");
    expect(note).toContain("19 mg reference");
    expect(plan.targets).toEqual(OWNER_TARGETS);
  });

  it("an iron-rich dish (≥20% of the reference in a serving) anchors a main meal", () => {
    const plan = gen({ day: OWNER_DAY, recentLog: ironPoorLog });
    const mainAnchors = plan.meals
      .filter((m) => m.meal === "lunch" || m.meal === "dinner")
      .map((m) => m.dishes.find((d) => d.role === "anchor"))
      .filter((d) => d !== undefined);
    expect(mainAnchors.some((d) => (d.nutrients.ironMg ?? 0) >= 3.8)).toBe(true);
  });
});
