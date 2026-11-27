/**
 * Reasons — the ONE place plan copy is written (brief v4, Working
 * Rule 4 + rulebook §22: the planner returns data, the UI owns the
 * words).
 *
 * The plan composer and the learning passes emit STRUCTURED reasons
 * — `{kind, ...numbers}` — and every user-facing sentence about why
 * a plan looks the way it does is built here, by `reasonCopy`. No
 * prose strings are built in planner or business logic any more;
 * that is the root fix for M-81 (a composer's long sentence was cut
 * mid-word by a storage clamp — sentences are never sliced here:
 * every `detail` is a complete sentence of at most 140 chars,
 * ending with a full stop, and `reasons.test.ts` pins that for
 * every kind).
 *
 * Unknown kinds render NOTHING (`reasonCopy` returns null) — a
 * reason this build does not know is dropped, never guessed at.
 */

import { fmtCount, fmtGrams, fmtKcalApprox, plural } from "./format";

/* ------------------------------ the data ------------------------------- */

/** One kitchen-relaxation stage, as a code. The composer reports
 *  WHICH stages fired; the words for them live in `reasonCopy`. */
export type KitchenRelaxationStage =
  | { stage: "prep-cap-raised"; minutes: number }
  | { stage: "prep-time-set-aside" }
  | { stage: "cooking-included" }
  | { stage: "extra-equipment" }
  | { stage: "equipment-set-aside" };

/**
 * A structured plan reason. Every field is data the composer
 * measured — counts, grams, names already on the record. Adding a
 * kind means adding its copy here and its pin in reasons.test.ts.
 */
export type PlanReason =
  | { kind: "log-protein-shortfall"; days: number; avgProteinG: number; targetProteinG: number }
  | { kind: "log-energy-overshoot"; days: number; avgKcal: number; targetKcal: number }
  | { kind: "favoured-dishes"; dishes: readonly { name: string; count: number }[]; windowDays: number }
  | { kind: "deprioritised-dishes"; names: readonly string[]; planDay: string; windowDays: number }
  | { kind: "micro-gap"; label: string; days: number; avg: number; unit: "g" | "mg"; reference: number }
  | { kind: "budget-widened"; ceilingRupees: number | null }
  | { kind: "country-widened"; countryName: string }
  | { kind: "food-side-widened"; countryName: string; sideLabel: string }
  | {
      kind: "kitchen-relaxed";
      answers: { noCook: boolean; capMinutes: number | null; equipmentListed: boolean };
      stages: readonly KitchenRelaxationStage[];
    }
  | { kind: "kitchen-cap-raised"; capMinutes: number; stageMinutes: number }
  | { kind: "kitchen-cap-quickest"; capMinutes: number }
  | { kind: "snack-added"; mealsPerDay: number }
  | { kind: "veg-shortfall"; actualG: number; guidelineG: number }
  | { kind: "fruit-shortfall"; actualG: number; guidelineG: number }
  | { kind: "milk-curd-shortfall"; actualG: number; guidelineG: number }
  | { kind: "protein-sources-few"; count: number }
  | { kind: "food-groups-few"; count: number; poolCount: number | null }
  | {
      kind: "protein-under";
      actualG: number;
      targetG: number;
      blocker: "caps" | "energy-topup-in-day" | "energy-no-topup";
    }
  | { kind: "protein-over"; actualG: number; targetG: number }
  | { kind: "kcal-off-guide"; actualKcal: number; targetKcal: number; direction: "over" | "under" }
  | { kind: "meal-empty" }
  | { kind: "meal-missing-layers"; layers: readonly string[] };

export type PlanReasonKind = PlanReason["kind"];

export const PLAN_REASON_KINDS: readonly PlanReasonKind[] = [
  "log-protein-shortfall",
  "log-energy-overshoot",
  "favoured-dishes",
  "deprioritised-dishes",
  "micro-gap",
  "budget-widened",
  "country-widened",
  "food-side-widened",
  "kitchen-relaxed",
  "kitchen-cap-raised",
  "kitchen-cap-quickest",
  "snack-added",
  "veg-shortfall",
  "fruit-shortfall",
  "milk-curd-shortfall",
  "protein-sources-few",
  "food-groups-few",
  "protein-under",
  "protein-over",
  "kcal-off-guide",
  "meal-empty",
  "meal-missing-layers",
];

/* ------------------------------ the copy ------------------------------- */

export interface ReasonCopy {
  title: string;
  detail: string;
  source: { label: string; kind: "measured" | "estimated" };
  action?: { label: string; href: string };
}

const whole = (n: number) => Math.round(n).toLocaleString("en-US");
const lowerFirst = (s: string) => (s.length > 0 ? s[0]!.toLowerCase() + s.slice(1) : s);
const avgText = (avg: number, unit: "g" | "mg") =>
  unit === "g" ? String(Math.round(avg * 10) / 10) : String(Math.round(avg));

const FOOD_LOG = { label: "Food log", kind: "measured" } as const;
const ASSESSMENT = { label: "Assessment", kind: "measured" } as const;
const PLAN_TOTALS = { label: "Plan totals", kind: "measured" } as const;
const GUIDELINE = { label: "ICMR-NIN guideline", kind: "measured" } as const;
const LIBRARY = { label: "Food library", kind: "measured" } as const;

/** The headline relaxation for the kitchen detail, in significance
 *  order: a person who said "no cooking" being served cooked dishes
 *  is the change that matters most; the full stage list rides on
 *  the reason object for surfaces that render chips (v4 Slice 4). */
function kitchenHeadline(stages: readonly KitchenRelaxationStage[]): string {
  const has = (s: KitchenRelaxationStage["stage"]) => stages.some((x) => x.stage === s);
  if (has("cooking-included")) return "cooking is allowed";
  if (has("equipment-set-aside")) return "the equipment list is set aside";
  if (has("extra-equipment")) return "one more piece of equipment is allowed";
  const raised = stages.find((x) => x.stage === "prep-cap-raised");
  if (raised && raised.stage === "prep-cap-raised")
    return `dishes taking up to ${raised.minutes} minutes are included`;
  if (has("prep-time-set-aside")) return "the prep-time aim is set aside";
  return "the limits are relaxed";
}

/**
 * The copy for one reason, or null for a kind this build does not
 * know (never guess). Every detail is ≤ 140 chars and ends with a
 * full stop — pinned per kind in reasons.test.ts; the console.warn
 * below is the runtime tripwire for a future kind that forgets.
 */
export function reasonCopy(reason: PlanReason): ReasonCopy | null {
  const copy: ReasonCopy | null = ((): ReasonCopy | null => {
    switch (reason.kind) {
      case "log-protein-shortfall":
        return {
          title: "Higher-protein picks",
          detail: `Your last ${reason.days} logged days averaged ${whole(reason.avgProteinG)} g protein against a ${whole(reason.targetProteinG)} g target. Target unchanged.`,
          source: FOOD_LOG,
        };
      case "log-energy-overshoot":
        return {
          title: "Lighter energy picks",
          detail: `Your last ${reason.days} logged days averaged ${whole(reason.avgKcal)} kcal against a ${whole(reason.targetKcal)} kcal target, so energy top-ups stay out.`,
          source: FOOD_LOG,
        };
      case "favoured-dishes": {
        const lead = reason.dishes[0];
        if (!lead) return null;
        return {
          title: "Your favourites lead",
          detail: `Dishes you return to lead this plan, led by ${lead.name} (logged ${lead.count} times).`,
          source: FOOD_LOG,
        };
      }
      case "deprioritised-dishes": {
        const first = reason.names[0];
        if (!first) return null;
        return reason.names.length === 1
          ? {
              title: "Served but never logged",
              detail: `${first} was in your ${reason.planDay} plan but has not been logged in the last ${reason.windowDays} days, so it sits further back.`,
              source: FOOD_LOG,
            }
          : {
              title: "Served but never logged",
              detail: `${first} and ${reason.names.length - 1} more were in your ${reason.planDay} plan, unlogged for ${reason.windowDays} days, so they sit further back.`,
              source: FOOD_LOG,
            };
      }
      case "micro-gap":
        return {
          title: `${reason.label} running low`,
          detail: `Over ${reason.days} logged days, ${lowerFirst(reason.label)} averaged ${avgText(reason.avg, reason.unit)} ${reason.unit} a day against the ${reason.reference} ${reason.unit} reference, so richer dishes are favoured.`,
          source: FOOD_LOG,
        };
      case "budget-widened":
        return {
          title: "Budget treated as a preference",
          detail:
            reason.ceilingRupees === null
              ? "Your meal budget leaves too few main dishes, so the plan treats it as a preference and includes dishes above it."
              : `Your budget (about ₹${reason.ceilingRupees} a serving) leaves too few main dishes, so the plan treats it as a preference.`,
          source: ASSESSMENT,
        };
      case "country-widened":
        return {
          title: "Country treated as a preference",
          detail: `Dishes from ${reason.countryName} alone leave too few main dishes, so your country is treated as a preference.`,
          source: ASSESSMENT,
        };
      case "food-side-widened":
        return {
          title: "Side widened to the whole country",
          detail: `${reason.sideLabel} dishes alone leave too few main dishes, so the plan draws from all of ${reason.countryName}.`,
          source: ASSESSMENT,
        };
      case "kitchen-relaxed":
        return {
          title: "Kitchen limits relaxed",
          detail: `Your kitchen answers leave almost no real dishes, so ${kitchenHeadline(reason.stages)}.`,
          source: ASSESSMENT,
          action: { label: "Review kitchen answers", href: "/profile#pf-assessment" },
        };
      case "kitchen-cap-raised":
        return {
          title: "Prep time stretched",
          detail: `Your kitchen answers aim for about ${reason.capMinutes} minutes to cook a main meal; today's dishes take up to about ${reason.stageMinutes} minutes, the closest fit.`,
          source: ASSESSMENT,
        };
      case "kitchen-cap-quickest":
        return {
          title: "Prep time stretched",
          detail: `Your kitchen answers aim for about ${reason.capMinutes} minutes, and every main dish takes longer, today uses the quickest there are.`,
          source: ASSESSMENT,
        };
      case "snack-added":
        return {
          title: "Snack added",
          detail: `You listed ${reason.mealsPerDay} meal${reason.mealsPerDay === 1 ? "" : "s"} a day; a snack spreads today across ${reason.mealsPerDay + 1} sittings.`,
          source: ASSESSMENT,
        };
      case "veg-shortfall":
        return {
          title: "Vegetables under guideline",
          detail: `Today's suggestions reach ${fmtGrams(reason.actualG)} g of vegetables, the ICMR-NIN guideline aims for at least ${fmtGrams(reason.guidelineG)} g across the day.`,
          source: GUIDELINE,
        };
      case "fruit-shortfall":
        return {
          title: "Fruit under guideline",
          detail: `Today's suggestions reach ${fmtGrams(reason.actualG)} g of fruit, the ICMR-NIN guideline aims for at least ${fmtGrams(reason.guidelineG)} g across the day.`,
          source: GUIDELINE,
        };
      case "milk-curd-shortfall":
        return {
          title: "Milk and curd under guideline",
          detail: `Today's suggestions reach ${fmtGrams(reason.actualG)} g of milk and curd, the ICMR-NIN guideline aims for at least ${fmtGrams(reason.guidelineG)} g across the day.`,
          source: GUIDELINE,
        };
      case "protein-sources-few":
        return {
          title: "Few protein sources",
          detail: `Today's protein comes from ${reason.count} source${reason.count === 1 ? "" : "s"}, three or more across the day is the aim, for variety.`,
          source: PLAN_TOTALS,
        };
      case "food-groups-few":
        return {
          title: "Few food groups",
          detail:
            reason.poolCount !== null
              ? `The foods Bloom can plan with today span ${reason.poolCount} food groups, the ICMR-NIN guideline aims for foods from at least 8 groups a day.`
              : `Today's suggestions span ${reason.count} food groups, the ICMR-NIN guideline aims for foods from at least 8 groups a day.`,
          source: GUIDELINE,
        };
      case "protein-under": {
        /* Every variant carries the shared stem "…g protein guide -"
           plus its true blocker clause: the plan matrices' honesty
           judge keys on that stem (its own documented contract), and
           a reader scanning the notes meets the same shape each time. */
        const lead = `Protein reaches about ${Math.round(reason.actualG)} g of your ${Math.round(reason.targetG)} g protein guide -`;
        return {
          title: "Protein under guide",
          detail:
            reason.blocker === "caps"
              ? `${lead} the portion caps bind before the target does.`
              : reason.blocker === "energy-topup-in-day"
                ? `${lead} a top-up is in the day, but the day is already over its energy guide.`
                : `${lead} the day is already over its energy guide, so no top-up was added.`,
          source: PLAN_TOTALS,
        };
      }
      case "protein-over":
        return {
          title: "Protein over guide",
          detail: `Today's suggestions reach about ${Math.round(reason.actualG)} g of protein, above your ${Math.round(reason.targetG)} g protein guide. The day's protein foods add up past it.`,
          source: PLAN_TOTALS,
        };
      case "kcal-off-guide":
        return reason.direction === "over"
          ? {
              title: "Energy over guide",
              detail: `Today's suggestions reach about ${fmtCount(reason.actualKcal)} kcal, above your ${fmtKcalApprox(reason.targetKcal)} guide. The day's guideline floors add up past it.`,
              source: PLAN_TOTALS,
            }
          : {
              title: "Energy under guide",
              detail: `Today's suggestions reach about ${fmtCount(reason.actualKcal)} kcal, below your ${fmtKcalApprox(reason.targetKcal)} guide. The portion caps bind before the target does.`,
              source: PLAN_TOTALS,
            };
      case "meal-empty":
        return {
          title: "Nothing fits this meal yet",
          detail: "No food with known values fits this meal yet. Add a food you eat, then regenerate the plan.",
          source: LIBRARY,
        };
      case "meal-missing-layers":
        return {
          title: "Part of this meal is missing",
          detail: `Part of this meal is missing: ${reason.layers.join(", ")}, no food with known values fits yet. Add a food you eat, then regenerate the plan.`,
          source: LIBRARY,
        };
      default:
        return null;
    }
  })();
  if (copy && copy.detail.length > 140) {
    console.warn("reason copy over 140 chars:", reason.kind, copy.detail.length);
  }
  return copy;
}

/** The detail sentence for a reason, or null when it renders nothing. */
export function reasonDetail(reason: PlanReason): string | null {
  return reasonCopy(reason)?.detail ?? null;
}

/** The plain-text form of a reason list — how `DailyPlan.notes`
 *  is derived at compose time, so every older consumer of the
 *  plan's notes reads the same words the reasons carry. */
export function reasonDetails(reasons: readonly PlanReason[]): string[] {
  const out: string[] = [];
  for (const reason of reasons) {
    const detail = reasonDetail(reason);
    if (detail) out.push(detail);
  }
  return out;
}

/* --------------------- adjustments (brief v7) -------------------------- */

/**
 * One planner-owned adjustment (brief v7): the plan's adjustments
 * array carries DATA only — `{kind, ...data}` — derived from the
 * plan's reasons by the ONE derivation in planView.ts
 * (`adjustmentsOf`). The words for an adjustment live here, in
 * `adjustmentCopy`, exactly as the words for a reason live in
 * `reasonCopy` above. The two vocabularies are deliberately
 * separate: a reason explains composition; an adjustment is one of
 * the few ways the plan DEPARTED from the person's stated answers
 * or record, and it renders as a row, never as prose in another
 * card (M-138).
 */
export type AdjustmentData =
  | { kind: "protein-lean"; days: number; avgG: number; targetG: number }
  | { kind: "kitchen-relaxed" }
  | { kind: "meal-added"; slot: string; assessmentMeals: number }
  | { kind: "budget-widened"; ceilingRupees: number | null }
  | { kind: "country-widened"; countryName: string }
  | { kind: "food-side-widened"; countryName: string; sideLabel: string }
  | { kind: "kitchen-cap-raised"; capMinutes: number; stageMinutes: number }
  | { kind: "kitchen-cap-quickest"; capMinutes: number }
  | { kind: "log-energy-overshoot"; days: number; avgKcal: number; targetKcal: number };

/** The loose shape `adjustmentCopy` accepts: an unknown kind, or a
 *  known kind with its data missing, is dropped (null) — never
 *  rendered as raw text. */
export interface AdjustmentLike {
  kind: string;
  days?: number;
  avgG?: number;
  targetG?: number;
  slot?: string;
  assessmentMeals?: number;
  ceilingRupees?: number | null;
  countryName?: string;
  sideLabel?: string;
  capMinutes?: number;
  stageMinutes?: number;
  avgKcal?: number;
  targetKcal?: number;
}

export interface AdjustmentCopy {
  /** An icon NAME from the house icon set (the renderer maps it). */
  icon: string;
  title: string;
  /** ≤ 140 chars, a complete sentence — pinned in reasons.test.ts. */
  detail: string;
  /** The dashed confidence badge ("Early read · 2 days"), when the
   *  adjustment rests on too little record to state plainly. */
  badge?: string;
  action?: { label: string; href: string };
}

/**
 * The copy for one adjustment, or null for a kind this build does
 * not know (never guess, never render the raw kind). Banned words
 * (brief v7 rule 9): "to go", "left", "failed" — pinned in tests.
 * The kitchen action points at the Assessment's real home (Profile),
 * the same href `reasonCopy`'s kitchen-relaxed action uses.
 */
export function adjustmentCopy(a: AdjustmentLike | null | undefined): AdjustmentCopy | null {
  if (!a) return null;
  const copy: AdjustmentCopy | null = ((): AdjustmentCopy | null => {
    switch (a.kind) {
      case "protein-lean": {
        if (a.days === undefined || a.avgG === undefined || a.targetG === undefined) return null;
        const days = a.days;
        return {
          icon: "trend",
          title: "Leaning protein-rich",
          detail: `Your last ${plural(days, "logged day")} averaged ${Math.round(a.avgG)} g, against a guide of ${Math.round(a.targetG)} g. Your guide is unchanged.`,
          ...(days < 7 ? { badge: `Early read · ${plural(days, "day")}` } : {}),
        };
      }
      case "kitchen-relaxed":
        return {
          icon: "pan",
          title: "Some dishes need cooking",
          detail: "Your answers leave very few no-cook dishes, so we included some that cook.",
          action: { label: "Update kitchen answers", href: "/profile#pf-assessment" },
        };
      case "meal-added": {
        if (a.slot === undefined || a.assessmentMeals === undefined) return null;
        return {
          icon: "plus",
          title: `Added a ${a.slot}`,
          detail: `Your Assessment lists ${plural(a.assessmentMeals, "meal")} a day. A ${a.slot} spreads the food across one more sitting.`,
        };
      }
      /* The remaining adjustment kinds `adjustmentsOf` returns —
         the planner's gates and the energy adaptation. They gained
         their row copy in brief v7 N4, when the adjusted section
         began rendering from this function alone: before that they
         were worded by `reasonCopy` in the old rows, and rendering
         from `adjustmentCopy` without them would have dropped
         adjustments the plan reports. The facts are the same ones
         `reasonCopy` states for these kinds; the shape is the
         row's (icon, title, one ≤140-char detail). */
      case "budget-widened": {
        if (a.ceilingRupees === undefined) return null;
        return {
          icon: "wallet",
          title: "Budget treated as a preference",
          detail:
            a.ceilingRupees === null
              ? "Your meal budget leaves too few main dishes, so the plan includes dishes above it."
              : `Your budget (about ₹${whole(a.ceilingRupees)} a serving) leaves too few main dishes, so the plan includes dishes above it.`,
        };
      }
      case "country-widened": {
        if (a.countryName === undefined) return null;
        return {
          icon: "globe",
          title: "Country treated as a preference",
          detail: `Dishes from ${a.countryName} alone leave too few main dishes, so your country is treated as a preference.`,
        };
      }
      case "food-side-widened": {
        if (a.countryName === undefined || a.sideLabel === undefined) return null;
        return {
          icon: "globe",
          title: "Side widened to the whole country",
          detail: `${a.sideLabel} dishes alone leave too few main dishes, so the plan draws from all of ${a.countryName}.`,
        };
      }
      case "kitchen-cap-raised": {
        if (a.capMinutes === undefined || a.stageMinutes === undefined) return null;
        return {
          icon: "clock",
          title: "Prep time stretched",
          detail: `Your answers aim for about ${a.capMinutes} minutes a main; today's dishes take up to about ${a.stageMinutes} minutes, the closest fit.`,
        };
      }
      case "kitchen-cap-quickest": {
        if (a.capMinutes === undefined) return null;
        return {
          icon: "clock",
          title: "Prep time stretched",
          detail: `Your answers aim for about ${a.capMinutes} minutes, and every main dish takes longer, today uses the quickest there are.`,
        };
      }
      case "log-energy-overshoot": {
        if (a.days === undefined || a.avgKcal === undefined || a.targetKcal === undefined)
          return null;
        return {
          icon: "flame",
          title: "Lighter energy picks",
          detail: `Your last ${plural(a.days, "logged day")} averaged ${whole(a.avgKcal)} kcal against a ${whole(a.targetKcal)} kcal target, so energy top-ups stay out.`,
        };
      }
      default:
        return null;
    }
  })();
  if (copy && copy.detail.length > 140) {
    console.warn("adjustment copy over 140 chars:", a.kind, copy.detail.length);
  }
  return copy;
}

/* --------------------- M-244: diagnosis + plan checks -------------------- */

export interface DiagnosisCopy {
  /** The Problem line: the goal, stated as the work. No numbers —
   *  the header's stat strip owns the figures (brief v7 rule 2). */
  problem: string;
  /** The Etiology line: what in the record the plan works with. */
  why: string;
  /** The Signs line: the measurable things this plan watches. */
  signs: string;
}

/** Structural twin of PlanDiagnosis (lib/nutrition/diagnosis.ts) —
 *  structural so this copy module imports no plan-view code. */
export interface DiagnosisLike {
  goalProfile: "lose" | "gain" | "maintain" | "recomp";
  conditionLabels: readonly string[];
  perMealProteinAimG: number;
  completeDaysInWindow: number;
  windowDays: number;
}

const DIAGNOSIS_PROBLEM: Record<DiagnosisLike["goalProfile"], string> = {
  lose: "Losing weight at a steady pace, without losing strength.",
  gain: "Gaining weight steadily, with strength to match.",
  maintain: "Holding your weight steady while eating well.",
  recomp: "Building strength and muscle while your weight holds steady.",
};

/**
 * The working diagnosis at the head of the plan (M-244, research
 * R-2511-01): a dietitian names the problem before the plan —
 * Problem, Etiology, Signs — in plain words, from the record.
 * Every line ≤ 140 chars and a complete sentence; no line claims
 * Bloom treats a condition (the guardrails are the plan's, the
 * condition is the person's own stated fact).
 */
export function diagnosisCopy(d: DiagnosisLike): DiagnosisCopy {
  const labels = d.conditionLabels;
  const why =
    labels.length === 0
      ? "This plan follows the goal and answers in your assessment."
      : labels.length === 1
        ? `Your assessment mentions ${labels[0]}, so its guardrails are on.`
        : labels.length === 2
          ? `Your assessment mentions ${labels[0]} and ${labels[1]}, so their guardrails are on.`
          : `Your assessment mentions ${labels[0]}, ${labels[1]} and ${labels.length - 2} more, so their guardrails are on.`;
  const aim = Math.round(d.perMealProteinAimG);
  const signs =
    d.completeDaysInWindow > 0
      ? `Each main meal aims for about ${aim} g of protein. ${plural(d.completeDaysInWindow, "complete day")} in the last 4 weeks are shaping this plan.`
      : `Each main meal aims for about ${aim} g of protein. No complete days logged yet, so nothing here is adapted.`;
  const copy = { problem: DIAGNOSIS_PROBLEM[d.goalProfile], why, signs };
  for (const line of Object.values(copy)) {
    if (line.length > 140) console.warn("diagnosis copy over 140 chars:", line.length);
  }
  return copy;
}

/** Structural twin of PlanChecks (lib/nutrition/planView.ts). */
export interface PlanChecksLike {
  sodium: { mg: number | null; ceilingMg: number; complete: boolean };
  sugar: {
    g: number | null;
    shareOfEnergyPct: number | null;
    limitPct: number;
    complete: boolean;
  };
}

/**
 * The plan's sodium and sugar lines (M-244, research R-2511-09 +
 * R-2511-10). A null figure renders no line at all — a nutrient
 * nothing in the plan reports is absent, never a dressed-up zero.
 * An incomplete total reads "at least": it is a floor over the
 * items that reported the nutrient, stated as one.
 */
export function planChecksCopy(checks: PlanChecksLike): {
  sodium: string | null;
  sugar: string | null;
} {
  const sodium =
    checks.sodium.mg === null
      ? null
      : `Sodium ${checks.sodium.complete ? "" : "at least "}${whole(checks.sodium.mg)} mg of the ${whole(checks.sodium.ceilingMg)} mg daily guide.`;
  const sugar =
    checks.sugar.g === null
      ? null
      : checks.sugar.shareOfEnergyPct === null
        ? `Sugar ${checks.sugar.complete ? "" : "at least "}${checks.sugar.g} g in the day's plan.`
        : `Sugar ${checks.sugar.complete ? "" : "at least "}${checks.sugar.g} g, ${checks.sugar.shareOfEnergyPct}% of the day's energy. The guide is under ${checks.sugar.limitPct}%.`;
  return { sodium, sugar };
}
