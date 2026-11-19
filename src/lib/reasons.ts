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

import { fmtCount, fmtGrams, fmtKcalApprox } from "./format";

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
          detail: `Your kitchen answers aim for about ${reason.capMinutes} minutes to cook a main meal; today's dishes take up to about ${reason.stageMinutes} minutes — the closest fit.`,
          source: ASSESSMENT,
        };
      case "kitchen-cap-quickest":
        return {
          title: "Prep time stretched",
          detail: `Your kitchen answers aim for about ${reason.capMinutes} minutes, and every main dish takes longer — today uses the quickest there are.`,
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
          detail: `Today's suggestions reach ${fmtGrams(reason.actualG)} g of vegetables — the ICMR-NIN guideline aims for at least ${fmtGrams(reason.guidelineG)} g across the day.`,
          source: GUIDELINE,
        };
      case "fruit-shortfall":
        return {
          title: "Fruit under guideline",
          detail: `Today's suggestions reach ${fmtGrams(reason.actualG)} g of fruit — the ICMR-NIN guideline aims for at least ${fmtGrams(reason.guidelineG)} g across the day.`,
          source: GUIDELINE,
        };
      case "milk-curd-shortfall":
        return {
          title: "Milk and curd under guideline",
          detail: `Today's suggestions reach ${fmtGrams(reason.actualG)} g of milk and curd — the ICMR-NIN guideline aims for at least ${fmtGrams(reason.guidelineG)} g across the day.`,
          source: GUIDELINE,
        };
      case "protein-sources-few":
        return {
          title: "Few protein sources",
          detail: `Today's protein comes from ${reason.count} source${reason.count === 1 ? "" : "s"} — three or more across the day is the aim, for variety.`,
          source: PLAN_TOTALS,
        };
      case "food-groups-few":
        return {
          title: "Few food groups",
          detail:
            reason.poolCount !== null
              ? `The foods Bloom can plan with today span ${reason.poolCount} food groups — the ICMR-NIN guideline aims for foods from at least 8 groups a day.`
              : `Today's suggestions span ${reason.count} food groups — the ICMR-NIN guideline aims for foods from at least 8 groups a day.`,
          source: GUIDELINE,
        };
      case "protein-under": {
        /* Every variant carries the shared stem "…g protein guide —"
           plus its true blocker clause: the plan matrices' honesty
           judge keys on that stem (its own documented contract), and
           a reader scanning the notes meets the same shape each time. */
        const lead = `Protein reaches about ${Math.round(reason.actualG)} g of your ${Math.round(reason.targetG)} g protein guide —`;
        return {
          title: "Protein under guide",
          detail:
            reason.blocker === "caps"
              ? `Today's suggestions reach about ${Math.round(reason.actualG)} g of your ${Math.round(reason.targetG)} g protein guide — the portion caps bind before the target does.`
              : reason.blocker === "energy-topup-in-day"
                ? `${lead} a top-up is in the day, but the day is already over its energy guide.`
                : `${lead} the day is already over its energy guide, so no top-up was added.`,
          source: PLAN_TOTALS,
        };
      }
      case "protein-over":
        return {
          title: "Protein over guide",
          detail: `Today's suggestions reach about ${Math.round(reason.actualG)} g of protein — above your ${Math.round(reason.targetG)} g protein guide. The day's protein foods add up past it.`,
          source: PLAN_TOTALS,
        };
      case "kcal-off-guide":
        return reason.direction === "over"
          ? {
              title: "Energy over guide",
              detail: `Today's suggestions reach about ${fmtCount(reason.actualKcal)} kcal — above your ${fmtKcalApprox(reason.targetKcal)} guide. The day's guideline floors add up past it.`,
              source: PLAN_TOTALS,
            }
          : {
              title: "Energy under guide",
              detail: `Today's suggestions reach about ${fmtCount(reason.actualKcal)} kcal — below your ${fmtKcalApprox(reason.targetKcal)} guide. The portion caps bind before the target does.`,
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
          detail: `Part of this meal is missing: ${reason.layers.join(", ")} — no food with known values fits yet. Add a food you eat, then regenerate the plan.`,
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
