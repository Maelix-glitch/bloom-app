import { describe, expect, it } from "vitest";

import {
  EMPTY_BEHAVIOURAL,
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type ActivityLevel,
  type BehaviouralProfile,
  type CuisinePreference,
  type DietaryPattern,
  type HealthProfile,
  type Sex,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY, PROTEIN_WAVE_DISH_IDS } from "./data/dishLibrary";
import { dishPatterns } from "./dishes";
import {
  floorTotalsOf,
  generatePlan,
  isProteinPowder,
  patternAllowsClassification,
  planPatternOf,
  type DailyPlan,
} from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food } from "./types";

/**
 * P12 verification: the 1000-run matrix (owner directive
 * 2026-11-19 — "run it 1000 times with different pattern, diet,
 * height, age, weight, goal, and tell me one by one").
 *
 * 1000 DISTINCT inputs: 5 dietary patterns × 5 goals × 8 bodies
 * (sex, age 22–68, height 155–188 cm, weight 52–112 kg, activity
 * sedentary–active — the gated engine computes each run's guide
 * from the body itself) × 5 rotations carrying cuisine, kitchen
 * behaviour, meals-per-day, day index, and the timeline anchor
 * (four usual-sleep windows + one relative day per rotation set).
 *
 * Every run is judged PERFECT only when every assertion holds:
 *   · day energy inside ±5% of its guide, protein inside 95–110%
 *     (a miss the plan's own notes name is honest — recorded as a
 *     band miss, never as a contract failure; an UNNAMED miss is
 *     a failure of the honesty contract itself);
 *   · zero dietary-pattern violations (dishes AND plain foods);
 *   · at most one dish in a main meal, no dish repeated in a day;
 *   · a real snack, a morning element, and a hydration schedule
 *     summing exactly to the gated outcome's own water figure;
 *   · main meals sanely proportioned against their share;
 *   · a complete timeline: opens on waking, closes at bedtime,
 *     every meal exactly once, wind-down present; on a clock day
 *     the first/last times are the anchor's own, times run in
 *     order, eating items keep >= 90 minutes between them and
 *     >= 60 minutes clear of bed; on a relative day, no times.
 *
 * The run records EVERY verdict and logs the breakdown the
 * report is written from: overall, and by pattern, goal, guide
 * size, cuisine, behaviour, age band, height band, weight band,
 * and anchor — with example runs per failure class.
 * PLAN_MATRIX_MEASURE=1 logs without asserting (iteration mode).
 *
 * Method 13 extension (2026-11-19, the dish-first repair): like
 * the 500 matrix, this suite never set a budget tier — the cells
 * now rotate the stated budget (unset / 1 / 2 / 3 / 2) and the
 * report breaks down by it. Each record also carries the day's
 * composition tallies (protein-wave servings by slot, shakes,
 * whether the snack carried a dish) so the report can state the
 * dish-first numbers alongside the band numbers.
 */

const NOW = "2026-11-19T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;
const MEASURE = process.env["PLAN_MATRIX_MEASURE"] === "1";

const PATTERNS: DietaryPattern[] = ["vegetarian", "eggetarian", "vegan", "pescatarian", "omnivore"];
const GOALS: HealthProfile["goal"][] = ["lose", "maintain", "gain", "recomp", "general_health"];
const CUISINES: (CuisinePreference | null)[] = [null, "north_indian", "south_indian", "both"];
const DAYS = [
  "2026-11-16",
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
  "2026-11-21",
  "2026-11-22",
];
const MEALS_PER_DAY: (number | null)[] = [3, null, 4, 2, 3];
/** Method 13: the stated-budget rotation (see the 500 matrix). */
const BUDGET_ROTATION: (1 | 2 | 3 | null)[] = [null, 1, 2, 3, 2];

interface Body {
  name: string;
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
}

const BODIES: Body[] = [
  { name: "F24-158-52-light", sex: "female", ageYears: 24, heightCm: 158, weightKg: 52, activity: "light" },
  { name: "F38-165-68-mod", sex: "female", ageYears: 38, heightCm: 165, weightKg: 68, activity: "moderate" },
  { name: "F55-160-74-sed", sex: "female", ageYears: 55, heightCm: 160, weightKg: 74, activity: "sedentary" },
  { name: "F68-155-60-light", sex: "female", ageYears: 68, heightCm: 155, weightKg: 60, activity: "light" },
  { name: "M22-172-62-active", sex: "male", ageYears: 22, heightCm: 172, weightKg: 62, activity: "active" },
  { name: "M30-178-80-mod", sex: "male", ageYears: 30, heightCm: 178, weightKg: 80, activity: "moderate" },
  { name: "M45-183-97-light", sex: "male", ageYears: 45, heightCm: 183, weightKg: 97, activity: "light" },
  { name: "M34-188-112-active", sex: "male", ageYears: 34, heightCm: 188, weightKg: 112, activity: "active" },
];

const BEHAVIOURS: { name: string; profile: BehaviouralProfile }[] = [
  { name: "plain", profile: EMPTY_BEHAVIOURAL },
  {
    name: "no-cook",
    profile: { ...EMPTY_BEHAVIOURAL, cookingAbility: "none", equipment: ["none"] },
  },
  { name: "hostel", profile: { ...EMPTY_BEHAVIOURAL, eatingSetting: "hostel" } },
  { name: "low-confidence", profile: { ...EMPTY_BEHAVIOURAL, confidence: 1, motivation: 2 } },
  {
    name: "prep-cap-20",
    profile: { ...EMPTY_BEHAVIOURAL, cookingAbility: "basic", prepTimeMaxMinutes: 20 },
  },
  {
    name: "hunger-nights",
    profile: { ...EMPTY_BEHAVIOURAL, hungerPattern: "nights", cravingKinds: ["sweet"] },
  },
];

const ANCHORS: { name: string; wakeTime: string | null; bedTime: string | null }[] = [
  { name: "relative", wakeTime: null, bedTime: null },
  { name: "early-0545-2215", wakeTime: "05:45", bedTime: "22:15" },
  { name: "standard-0700-2300", wakeTime: "07:00", bedTime: "23:00" },
  { name: "late-0815-2345", wakeTime: "08:15", bedTime: "23:45" },
  { name: "owl-0930-0100", wakeTime: "09:30", bedTime: "01:00" },
];

const FOOD_BY_ID = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f]));
const DISH_BY_ID = new Map(DISH_LIBRARY.map((d) => [d.id, d]));

function buildProfile(
  pattern: DietaryPattern,
  goal: HealthProfile["goal"],
  body: Body,
  opts: {
    mealsPerDay?: number | null;
    cuisine?: CuisinePreference | null;
    behaviour?: BehaviouralProfile;
    budgetTier?: 1 | 2 | 3 | null;
  },
): HealthProfile {
  return {
    ...emptyProfile("user-matrix1000", "2026-06-01T07:00:00Z"),
    ageYears: body.ageYears,
    sex: body.sex,
    height: observation(quantity(body.heightCm, "cm"), PROVENANCE),
    weight: observation(quantity(body.weightKg, "kg"), PROVENANCE),
    goal,
    activity: body.activity,
    rateKgPerWeek: goal === "lose" ? 0.5 : goal === "gain" ? 0.3 : 0,
    dietary: {
      ...EMPTY_DIETARY,
      pattern,
      mealsPerDay: opts.mealsPerDay ?? 3,
      cuisinePreference: opts.cuisine ?? null,
      budgetTier: opts.budgetTier ?? null,
    },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
    },
    behavioural: opts.behaviour ?? EMPTY_BEHAVIOURAL,
  };
}

/* ------------------------------- judging ---------------------------------- */

type FailureClass =
  | "kcal_over"
  | "kcal_under"
  | "protein_over"
  | "protein_under"
  | "unnamed_miss"
  | "pattern_violation"
  | "multi_dish_main"
  | "dish_repeat"
  | "snack_missing"
  | "morning_missing"
  | "hydration_missing"
  | "hydration_inexact"
  | "tally_mismatch"
  | "meal_share"
  | "timeline_missing"
  | "timeline_structure"
  | "timeline_anchor"
  | "timeline_order"
  | "timeline_spacing"
  | "timeline_last_eating";

const HARD_CLASSES: ReadonlySet<FailureClass> = new Set([
  "unnamed_miss",
  "pattern_violation",
  "multi_dish_main",
  "dish_repeat",
  "snack_missing",
  "morning_missing",
  "hydration_missing",
  "hydration_inexact",
  "tally_mismatch",
  "meal_share",
  "timeline_missing",
  "timeline_structure",
  "timeline_anchor",
  "timeline_order",
  "timeline_spacing",
  "timeline_last_eating",
]);

interface RunRecord {
  label: string;
  pattern: DietaryPattern;
  goal: string;
  body: Body;
  cuisine: string;
  behaviour: string;
  anchor: string;
  budget: string;
  sizeBand: string;
  composition: "dish" | "food" | "mixed";
  failures: FailureClass[];
  kcalDev: number;
  proteinDev: number;
  /* Method 13 composition tallies for the day. */
  pwBySlot: { breakfast: number; lunch: number; dinner: number; snack: number };
  shakes: number;
  snackDish: boolean;
}

const records: RunRecord[] = [];
const hardFailures: string[] = [];

const kcalNamed = (plan: DailyPlan) =>
  plan.notes.some((n) => n.includes("kcal — above your") || n.includes("kcal — below your"));
const proteinNamed = (plan: DailyPlan, over: boolean) =>
  over
    ? plan.notes.some((n) => n.includes("g of protein — above your"))
    : /* Any shortfall note that states the figure against the guide
         names the miss: "— the portion caps bind…", or P12's
         energy-bind wordings ("— the day is already over its
         energy guide, so no top-up was added…" / "— a protein
         top-up is in the day…"). The detector keys on the shared
         "protein guide —" stem, not one sentence. */
      plan.notes.some((n) => n.includes("protein guide —"));

const minutesOf = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

function judgeTimeline(
  failures: FailureClass[],
  label: string,
  plan: DailyPlan,
  anchor: (typeof ANCHORS)[number],
): void {
  const timeline = plan.timeline;
  if (!timeline) {
    failures.push("timeline_missing");
    if (!MEASURE) hardFailures.push(`${label}: no timeline`);
    return;
  }
  const items = timeline.items;
  const structureOk =
    items.length >= 4 &&
    items[0]!.kind === "wake" &&
    items[items.length - 1]!.kind === "sleep" &&
    items.filter((i) => i.kind === "wake").length === 1 &&
    items.filter((i) => i.kind === "sleep").length === 1 &&
    items.filter((i) => i.kind === "wind_down").length === 1;
  if (!structureOk) {
    failures.push("timeline_structure");
    if (!MEASURE) hardFailures.push(`${label}: timeline structure broken`);
  }
  const timelineMeals = items.filter((i) => i.kind === "meal").map((i) => i.meal);
  if (
    new Set(timelineMeals).size !== timelineMeals.length ||
    [...timelineMeals].sort().join() !== plan.meals.map((m) => m.meal).sort().join()
  ) {
    failures.push("timeline_structure");
    if (!MEASURE) hardFailures.push(`${label}: timeline meals do not match the plan's meals`);
  }
  if (anchor.wakeTime === null) {
    if (timeline.anchor !== "relative" || items.some((i) => i.time !== null)) {
      failures.push("timeline_anchor");
      if (!MEASURE) hardFailures.push(`${label}: relative day carries clock times`);
    }
    return;
  }
  if (
    timeline.anchor !== "sleep_log" ||
    items[0]!.time !== anchor.wakeTime ||
    items[items.length - 1]!.time !== anchor.bedTime ||
    items.some((i) => i.time === null)
  ) {
    failures.push("timeline_anchor");
    if (!MEASURE) hardFailures.push(`${label}: clock day not framed by the anchor's own times`);
    return;
  }
  const origin = minutesOf(items[0]!.time!);
  const line = items.map((i) => {
    let t = minutesOf(i.time!);
    if (t < origin) t += 1440;
    return t;
  });
  for (let i = 1; i < line.length; i++) {
    if (line[i]! <= line[i - 1]!) {
      failures.push("timeline_order");
      if (!MEASURE) hardFailures.push(`${label}: timeline times out of order`);
      break;
    }
  }
  const eatingIdx = items
    .map((item, idx) => (item.kind === "meal" ? idx : -1))
    .filter((idx) => idx >= 0);
  for (let k = 1; k < eatingIdx.length; k++) {
    if (line[eatingIdx[k]!]! - line[eatingIdx[k - 1]!]! < 90) {
      failures.push("timeline_spacing");
      if (!MEASURE) {
        hardFailures.push(
          `${label}: eating items ${line[eatingIdx[k]!]! - line[eatingIdx[k - 1]!]!} min apart`,
        );
      }
      break;
    }
  }
  const bedLine = line[line.length - 1]!;
  if (eatingIdx.length > 0 && bedLine - line[eatingIdx[eatingIdx.length - 1]!]! < 60) {
    failures.push("timeline_last_eating");
    if (!MEASURE) hardFailures.push(`${label}: last eating item too close to bed`);
  }
}

function judgeRun(
  dims: Omit<
    RunRecord,
    "failures" | "kcalDev" | "proteinDev" | "sizeBand" | "composition" | "pwBySlot" | "shakes" | "snackDish"
  >,
  plan: DailyPlan,
  anchor: (typeof ANCHORS)[number],
  expectedWaterMl: number,
): void {
  const failures: FailureClass[] = [];
  const t = plan.targets;
  let kcal = 0;
  let protein = 0;
  const dishIds: string[] = [];
  let dishMains = 0;
  let mains = 0;
  /* Method 13 composition tallies. */
  const pwBySlot = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  let shakes = 0;
  let snackDish = false;
  for (const meal of plan.meals) {
    for (const d of meal.dishes) {
      if (PROTEIN_WAVE_DISH_IDS.has(d.dishId)) pwBySlot[meal.meal] += 1;
      if (DISH_BY_ID.get(d.dishId)?.category === "shake") shakes += 1;
    }
    if (meal.meal === "snack" && meal.dishes.length > 0) snackDish = true;
    const mealKcal =
      meal.dishes.reduce((a, d) => a + d.nutrients.kcal, 0) +
      meal.suggestions.reduce((a, s) => a + s.nutrients.kcal, 0);
    kcal += mealKcal;
    protein +=
      meal.dishes.reduce((a, d) => a + d.nutrients.proteinG, 0) +
      meal.suggestions.reduce((a, s) => a + s.nutrients.proteinG, 0);
    if (meal.meal !== "snack") {
      mains += 1;
      if (meal.dishes.length > 1) failures.push("multi_dish_main");
      if (meal.dishes.length === 1) dishMains += 1;
      const ratio = meal.kcal > 0 ? mealKcal / meal.kcal : 0;
      if (meal.dishes.length + meal.suggestions.length > 0 && (ratio < 0.45 || ratio > 1.6)) {
        failures.push("meal_share");
      }
    }
    for (const d of meal.dishes) dishIds.push(d.dishId);
  }
  if (new Set(dishIds).size !== dishIds.length) failures.push("dish_repeat");

  const planPattern = planPatternOf(dims.pattern);
  if (planPattern) {
    for (const meal of plan.meals) {
      for (const d of meal.dishes) {
        const dish = DISH_BY_ID.get(d.dishId);
        if (dish && !dishPatterns(dish).includes(planPattern)) {
          failures.push("pattern_violation");
        }
      }
      for (const s of meal.suggestions) {
        const food: Food | undefined = FOOD_BY_ID.get(s.foodId);
        if (food?.classification && !patternAllowsClassification(planPattern, food.classification)) {
          failures.push("pattern_violation");
        }
      }
    }
  }

  const kcalDev = kcal / t.kcal - 1;
  const proteinDev = protein / t.proteinG - 1;
  if (kcalDev > 0.051) failures.push("kcal_over");
  else if (kcalDev < -0.051) failures.push("kcal_under");
  if (proteinDev > 0.101) failures.push("protein_over");
  else if (proteinDev < -0.051) failures.push("protein_under");
  const kcalOut = kcalDev > 0.051 || kcalDev < -0.051;
  const proteinOut = proteinDev > 0.101 || proteinDev < -0.051;
  if ((kcalOut && !kcalNamed(plan)) || (proteinOut && !proteinNamed(plan, proteinDev > 0))) {
    failures.push("unnamed_miss");
  }

  const snack = plan.meals.find((m) => m.meal === "snack");
  if (!snack || snack.suggestions.length + snack.dishes.length === 0) {
    failures.push("snack_missing");
  }
  if (!plan.morning || plan.morning.waterMl <= 0) failures.push("morning_missing");
  if (!plan.hydration) {
    failures.push("hydration_missing");
  } else {
    const sum = plan.hydration.wakeMl + plan.hydration.perMeal.reduce((a, p) => a + p.ml, 0);
    if (
      sum !== plan.hydration.targetMl ||
      plan.hydration.totalMl !== plan.hydration.targetMl ||
      plan.hydration.targetMl !== expectedWaterMl
    ) {
      failures.push("hydration_inexact");
    }
  }

  /* The milk-and-curd tally must speak the truth (P12 fix): the
     note fires exactly when the served tally is under the 300 g
     floor, and the figure it states is the tally itself — a live
     day serving an Enriched Fruit and Curd Bowl plus a ricotta
     snack once read "0 g" here, because the tally's protein cut
     excluded the curd the dish is made of. */
  const milkTally = floorTotalsOf(plan.meals, FOOD_BY_ID, DISH_BY_ID).milkCurdG;
  const milkNote = plan.notes.find((n) => n.includes("g of milk and curd"));
  if (milkTally >= 300 && milkNote) failures.push("tally_mismatch");
  if (milkTally < 300) {
    if (!milkNote) {
      failures.push("tally_mismatch");
    } else {
      const m = /reach ([\d,]+) g of milk and curd/.exec(milkNote);
      const stated = m ? Number(m[1]!.replace(/,/g, "")) : NaN;
      if (!Number.isFinite(stated) || Math.abs(stated - Math.round(milkTally)) > 1) {
        failures.push("tally_mismatch");
      }
    }
  }

  judgeTimeline(failures, dims.label, plan, anchor);

  const uniqueFailures = [...new Set(failures)];
  for (const f of uniqueFailures) {
    if (HARD_CLASSES.has(f) && !MEASURE) {
      hardFailures.push(`${dims.label}: ${f} (kcal ${(kcalDev * 100).toFixed(1)}%, protein ${(proteinDev * 100).toFixed(1)}%)`);
    }
  }
  records.push({
    ...dims,
    sizeBand:
      t.kcal < 1800 ? "<1800" : t.kcal < 2400 ? "1800-2399" : t.kcal < 3000 ? "2400-2999" : ">=3000",
    composition: dishMains === 0 ? "food" : dishMains === mains ? "dish" : "mixed",
    failures: uniqueFailures,
    kcalDev,
    proteinDev,
    pwBySlot,
    shakes,
    snackDish,
  });
}

/* ------------------------------ the matrix -------------------------------- */

function runBlock(from: number, to: number): void {
  let g = 0;
  for (const pattern of PATTERNS) {
    for (const goal of GOALS) {
      for (const body of BODIES) {
        for (let rotation = 0; rotation < 5; rotation++) {
          if (g >= from && g < to) {
            const day = DAYS[g % DAYS.length]!;
            const cuisine = CUISINES[Math.floor(g / 7) % CUISINES.length]!;
            const behaviour = BEHAVIOURS[Math.floor(g / 3) % BEHAVIOURS.length]!;
            const mealsPerDay = MEALS_PER_DAY[Math.floor(g / 5) % MEALS_PER_DAY.length]!;
            const budgetTier = BUDGET_ROTATION[g % BUDGET_ROTATION.length]!;
            const anchor = ANCHORS[rotation]!;
            const label = `${pattern}/${goal}/${body.name}/${cuisine ?? "nocuisine"}/${behaviour.name}/mpd${mealsPerDay ?? "null"}/b${budgetTier ?? "u"}/${anchor.name}/${day}`;
            const profile = buildProfile(pattern, goal, body, {
              mealsPerDay,
              cuisine,
              behaviour: behaviour.profile,
              budgetTier,
            });
            const safety = classifySafety(toSafetyInput(profile));
            const gated = targetsFor(profile, safety, day);
            if (!gated.ok) throw new Error(`gated outcome refused for ${label}`);
            const outcome = generatePlan({
              profile,
              safety,
              gatedOutcome: gated,
              fallbackTargets: null,
              foods: USDA_REFERENCE_FOODS,
              dishes: DISH_LIBRARY,
              ...(anchor.wakeTime ? { wakeTime: anchor.wakeTime, bedTime: anchor.bedTime } : {}),
              day,
              now: NOW,
              id: "plan-matrix1000",
            });
            if (!outcome.ok) throw new Error(`plan refused: ${label}: ${JSON.stringify(outcome.refusal)}`);
            judgeRun(
              {
                label,
                pattern,
                goal: goal!,
                body,
                cuisine: cuisine ?? "none",
                behaviour: behaviour.name,
                anchor: anchor.name,
                budget: budgetTier === null ? "unset" : `tier${budgetTier}`,
              },
              outcome.plan,
              anchor,
              Math.round(gated.targets.waterMl),
            );
          }
          g += 1;
        }
      }
    }
  }
}

/* ------------------------------- reporting --------------------------------- */

function summarise(name: string, list: RunRecord[]): void {
  const perfect = list.filter((r) => r.failures.length === 0).length;
  const classes = new Map<FailureClass, number>();
  for (const r of list) {
    for (const f of r.failures) classes.set(f, (classes.get(f) ?? 0) + 1);
  }
  const classText = [...classes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `${f}=${n}`)
    .join(" ");
  console.log(`[m1000 ${name}] n=${list.length} perfect=${perfect} ${classText}`);
}

function byDimension(name: string, key: (r: RunRecord) => string): void {
  const groups = new Map<string, RunRecord[]>();
  for (const r of records) {
    const k = key(r);
    const list = groups.get(k) ?? [];
    list.push(r);
    groups.set(k, list);
  }
  for (const [k, list] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    summarise(`${name}:${k}`, list);
  }
}

function reportAll(): void {
  summarise("overall", records);
  byDimension("pattern", (r) => r.pattern);
  byDimension("goal", (r) => r.goal);
  byDimension("size", (r) => r.sizeBand);
  byDimension("cuisine", (r) => r.cuisine);
  byDimension("behaviour", (r) => r.behaviour);
  byDimension("anchor", (r) => r.anchor);
  byDimension("budget", (r) => r.budget);
  byDimension("composition", (r) => r.composition);
  /* Method 13 composition totals across the whole matrix. */
  const pw = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  let shakes = 0;
  let snackDishDays = 0;
  for (const r of records) {
    pw.breakfast += r.pwBySlot.breakfast;
    pw.lunch += r.pwBySlot.lunch;
    pw.dinner += r.pwBySlot.dinner;
    pw.snack += r.pwBySlot.snack;
    shakes += r.shakes;
    if (r.snackDish) snackDishDays += 1;
  }
  console.log(
    `[m1000 composition] pwBySlot=b${pw.breakfast}/l${pw.lunch}/d${pw.dinner}/s${pw.snack} shakes=${shakes} snackDishDays=${snackDishDays}/${records.length}`,
  );
  byDimension("age", (r) =>
    r.body.ageYears < 30 ? "18-29" : r.body.ageYears < 45 ? "30-44" : r.body.ageYears < 60 ? "45-59" : "60+",
  );
  byDimension("height", (r) =>
    r.body.heightCm < 160 ? "<160" : r.body.heightCm < 170 ? "160-169" : r.body.heightCm < 180 ? "170-179" : ">=180",
  );
  byDimension("weight", (r) =>
    r.body.weightKg < 60 ? "<60" : r.body.weightKg < 80 ? "60-79" : r.body.weightKg < 100 ? "80-99" : ">=100",
  );
  const classes = new Map<FailureClass, RunRecord[]>();
  for (const r of records) {
    for (const f of r.failures) {
      const list = classes.get(f) ?? [];
      list.push(r);
      classes.set(f, list);
    }
  }
  for (const [f, list] of [...classes.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const examples = [...list]
      .sort((a, b) => Math.abs(b.kcalDev) + Math.abs(b.proteinDev) - (Math.abs(a.kcalDev) + Math.abs(a.proteinDev)))
      .slice(0, 3)
      .map(
        (r) =>
          `${r.label} [kcal ${(r.kcalDev * 100).toFixed(1)}%, protein ${(r.proteinDev * 100).toFixed(1)}%, ${r.composition}]`,
      )
      .join(" | ");
    console.log(`[m1000 example ${f}] ${examples}`);
  }
  const worstProteinUnder = [...records].sort((a, b) => a.proteinDev - b.proteinDev)[0];
  const worstProteinOver = [...records].sort((a, b) => b.proteinDev - a.proteinDev)[0];
  const worstKcalUnder = [...records].sort((a, b) => a.kcalDev - b.kcalDev)[0];
  const worstKcalOver = [...records].sort((a, b) => b.kcalDev - a.kcalDev)[0];
  for (const [name, r] of [
    ["worstProteinUnder", worstProteinUnder],
    ["worstProteinOver", worstProteinOver],
    ["worstKcalUnder", worstKcalUnder],
    ["worstKcalOver", worstKcalOver],
  ] as const) {
    if (r) {
      console.log(
        `[m1000 ${name}] ${r.label} kcal=${(r.kcalDev * 100).toFixed(1)}% protein=${(r.proteinDev * 100).toFixed(1)}%`,
      );
    }
  }
}

describe("plan matrix 1000", () => {
  it(
    "first 500 runs",
    { timeout: 600_000 },
    () => {
      runBlock(0, 500);
      expect(records.length).toBe(500);
    },
  );

  it(
    "second 500 runs + full report",
    { timeout: 600_000 },
    () => {
      runBlock(500, 1000);
      expect(records.length).toBe(1000);
      reportAll();
      /* Method 13: shakes are servable across the matrix (they
         were structurally unservable before it — the count was 0
         by construction), and the snack carries a dish on the
         great majority of days. */
      const shakes = records.reduce((a, r) => a + r.shakes, 0);
      expect(shakes).toBeGreaterThan(0);
      if (!MEASURE) expect(hardFailures).toEqual([]);
    },
  );
});

/**
 * THE OWNER'S CORNER (live finding, 2026-11-19 ~01:56 IST): a small
 * energy guide with a very dense protein guide (~1,350 kcal ·
 * ~171 g on the owner's real account). The composed day ran over
 * on energy (the floors and layers add up past the guide) and a
 * few grams short on protein — and NO top-up was served, because
 * the closing pass spends protein top-ups only out of the day's
 * +5% energy room, which was already gone. P12's answer is the
 * gap scoop (one gap-sized powder portion, judged on its own
 * energy) plus an honest note: when a day still ends protein-short
 * AND energy-over with no powder top-up in it, the plan must say
 * WHY — the energy, not silence. These cells pin that contract on
 * the shape itself, across patterns.
 */
describe("plan matrix 1000 — the owner's dense-protein corner", () => {
  const CELLS: {
    pattern: DietaryPattern;
    goal: HealthProfile["goal"];
    body: Body;
    day: string;
  }[] = [
    {
      pattern: "omnivore",
      goal: "lose",
      body: { name: "F55-160-74-sed", sex: "female", ageYears: 55, heightCm: 160, weightKg: 74, activity: "sedentary" },
      day: "2026-11-21",
    },
    {
      pattern: "vegetarian",
      goal: "lose",
      body: { name: "F55-160-74-sed", sex: "female", ageYears: 55, heightCm: 160, weightKg: 74, activity: "sedentary" },
      day: "2026-11-19",
    },
    {
      pattern: "omnivore",
      goal: "recomp",
      body: { name: "M45-178-105-sed", sex: "male", ageYears: 45, heightCm: 178, weightKg: 105, activity: "sedentary" },
      day: "2026-11-20",
    },
    {
      pattern: "vegetarian",
      goal: "recomp",
      body: { name: "F45-158-92-light", sex: "female", ageYears: 45, heightCm: 158, weightKg: 92, activity: "light" },
      day: "2026-11-17",
    },
    {
      pattern: "vegan",
      goal: "lose",
      body: { name: "F38-165-84-sed", sex: "female", ageYears: 38, heightCm: 165, weightKg: 84, activity: "sedentary" },
      day: "2026-11-18",
    },
    {
      pattern: "eggetarian",
      goal: "lose",
      body: { name: "M50-172-118-sed", sex: "male", ageYears: 50, heightCm: 172, weightKg: 118, activity: "sedentary" },
      day: "2026-11-22",
    },
  ];

  it(
    "protein-short + energy-over is never silent: a scoop, or the reason in the notes",
    { timeout: 600_000 },
    () => {
      for (const cell of CELLS) {
        const profile = buildProfile(cell.pattern, cell.goal, cell.body, {});
        const safety = classifySafety(toSafetyInput(profile));
        const gated = targetsFor(profile, safety, cell.day);
        if (!gated.ok) throw new Error(`corner gated refused: ${cell.pattern}/${cell.goal}`);
        const t = gated.targets;
        /* The shape itself is asserted — a cell that stops being
           a dense-protein small-guide day fails loudly here rather
           than silently testing something else. */
        expect(t.proteinG / t.calorieTargetKcal).toBeGreaterThanOrEqual(0.095);
        const outcome = generatePlan({
          profile,
          safety,
          gatedOutcome: gated,
          fallbackTargets: null,
          foods: USDA_REFERENCE_FOODS,
          dishes: DISH_LIBRARY,
          day: cell.day,
          now: NOW,
          id: "plan-corner",
        });
        if (!outcome.ok) throw new Error(`corner plan refused: ${cell.pattern}/${cell.goal}`);
        const plan = outcome.plan;
        const kcal = plan.meals.reduce(
          (a, m) =>
            a +
            m.dishes.reduce((x, d) => x + d.nutrients.kcal, 0) +
            m.suggestions.reduce((x, s) => x + s.nutrients.kcal, 0),
          0,
        );
        const protein = plan.meals.reduce(
          (a, m) =>
            a +
            m.dishes.reduce((x, d) => x + d.nutrients.proteinG, 0) +
            m.suggestions.reduce((x, s) => x + s.nutrients.proteinG, 0),
          0,
        );
        const powderInDay = plan.meals.some((m) =>
          m.suggestions.some((s) => {
            const food = FOOD_BY_ID.get(s.foodId);
            return s.layer === "topup" && food !== undefined && isProteinPowder(food);
          }),
        );
        const whyNote = plan.notes.some((n) => n.includes("already over its energy guide"));
        console.log(
          `[corner ${cell.pattern}/${cell.goal}/${cell.body.name}/${cell.day}] guide ${t.calorieTargetKcal}/${t.proteinG} -> ${Math.round(kcal)} kcal (${((kcal / t.calorieTargetKcal - 1) * 100).toFixed(1)}%), ${protein.toFixed(1)} g protein (${((protein / t.proteinG - 1) * 100).toFixed(1)}%) powderTopUp=${powderInDay} whyNote=${whyNote}`,
        );
        const proteinShort = protein < 0.95 * t.proteinG;
        const kcalOver = kcal > 1.05 * t.calorieTargetKcal;
        if (proteinShort && kcalOver && !powderInDay) {
          expect(whyNote, `${cell.pattern}/${cell.goal}: silent protein-short energy-over day`).toBe(true);
        }
      }
    },
  );
});
