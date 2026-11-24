/**
 * buildVitalisContext — the ONLY record Vitalis ever sees.
 *
 * Vitalis (the orb's AI) is deliberately not the Coach: it gets no
 * thread, no memories, and none of the rest of Bloom. Its context is
 * assembled here, from Nutrition + Assessment data only:
 *
 *   · the Assessment state (answers, completion) — including the body
 *     basics and safety answers the Assessment itself holds;
 *   · the engine's nutrition targets — or the honest fact that the
 *     safety gate has not cleared any, in which case NO number is
 *     handed over for the model to quote;
 *   · the current plan, exactly as the plan engine composed it;
 *   · the food log: today in detail, the last week as day summaries;
 *   · the person's own foods, and the library dishes that suit their
 *     stated pattern — the only things Vitalis may recommend from.
 *
 * The function is pure and takes plain slices, so its scope is pinned
 * by tests: feed it decoy data from other domains and none of it can
 * appear, because there is no field here that could carry it.
 *
 * Alongside the rendered text it returns the record's structured twin
 * (schema v1): the same facts as data, which the function's
 * deliberation checks, proposal validation and payload validation
 * read — checks never parse the prose meant for the model.
 */

import { FAILURE_REASON_LABEL, GOAL_LABEL } from "@/lib/assessment/questions";
import type { AssessmentAnswers, AssessmentStatus } from "@/lib/assessment/state";
import type { Nutrients, NutritionTargets } from "@/lib/nutrition";
import {
  HIGH_RISK_CONDITION_LABEL,
  URGENT_SYMPTOM_LABEL,
  type HighRiskCondition,
  type UrgentSymptom,
} from "@/lib/vitalis/domain/safety";

/* ------------------------------------------------------------------ */
/*  Inputs — plain slices of the two domains, nothing else             */
/* ------------------------------------------------------------------ */

export interface VitalisAssessmentSlice {
  status: AssessmentStatus;
  completedAt: string | null;
  answers: AssessmentAnswers;
}

export interface VitalisPlanMealSlice {
  meal: string;
  /** This meal's share of the day targets, as the engine composed it. */
  kcal: number;
  proteinG: number;
  /** "Paneer bhurji (120 g)" — suggestion names with their amounts,
   *  with the meal's dishes first ("Paneer Tikka (dish)"). */
  items: string[];
  /** The meal's plan dishes, by library id — what a swap_dish
   *  proposal names as its from-dish. */
  dishIds: string[];
  note: string | null;
}

export interface VitalisPlanSlice {
  /** The day the plan was made for (a local day key). */
  day: string;
  stale: boolean;
  goalLabel: string;
  targets: NutritionTargets;
  meals: VitalisPlanMealSlice[];
  notes: string[];
}

export interface VitalisLogEntrySlice {
  name: string;
  meal: string;
  kcal: number;
  proteinG: number;
}

export interface VitalisDaySlice {
  day: string;
  entries: VitalisLogEntrySlice[];
  totals: Nutrients;
}

export interface VitalisRecentDaySlice {
  day: string;
  entriesCount: number;
  totals: Nutrients;
  /** Entry names, when the caller has them — the structured record's
   *  evidence of what the person actually eats (enjoyment checks). */
  names?: string[];
}

export interface VitalisContextInput {
  /** Today, as a local day key. */
  today: string;
  assessment: VitalisAssessmentSlice;
  /** The engine's targets, or null when none may be quoted. */
  targets: NutritionTargets | null;
  /** True when the safety gate refused targets outright — a different
   *  honesty from "not enough information yet", and Vitalis is told
   *  which one it is. */
  targetsBlocked: boolean;
  plan: VitalisPlanSlice | null;
  todayLog: VitalisDaySlice;
  /** Up to the last seven logged days before today, newest first. */
  recentDays: VitalisRecentDaySlice[];
  /** The person's own foods (per-100 g values), capped by the caller.
   *  `id` is the food's id when the caller has it — proposals and the
   *  structured record can only reference foods that carry one. */
  customFoods: { id?: string; name: string; kcal: number; proteinG: number }[];
  /** Library dishes that suit the person's pattern, capped by the
   *  caller — name, category and per-serving values, all computed.
   *  `id` as above: only id-carrying dishes can be proposed/logged. */
  dishes: { id?: string; name: string; category: string; kcal: number; proteinG: number }[];
}

/**
 * The structured twin of the rendered record (schema v1), sent to the
 * function as `vitalisRecord` and validated there by the shared core
 * (`supabase/functions/coach/vitalis-core.ts` — the shapes are kept
 * identical by hand and by tests on both sides). Deliberation checks,
 * action-proposal validation and payload validation all read THIS,
 * never the prose.
 */
export interface VitalisStructuredRecord {
  v: 1;
  pattern: string | null;
  allergies: string[];
  dislikes: string[];
  intolerances: string[];
  safety: {
    pregnantOrBreastfeeding: boolean | null;
    eatingDisorderHistory: boolean | null;
    takesMedication: boolean | null;
    unexplainedWeightChange: boolean | null;
    conditions: string[];
    symptoms: string[];
  };
  targets: { kcal: number; proteinG: number } | null;
  targetsBlocked: boolean;
  plan: {
    day: string;
    kcal: number;
    proteinG: number;
    meals: { meal: string; kcal: number; proteinG: number; items: string[]; dishIds: string[] }[];
  } | null;
  todayTotals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  dishes: { id: string; name: string; kcal: number; proteinG: number }[];
  foods: { id: string; name: string; kcalPer100g: number; proteinPer100g: number }[];
  loggedNames: string[];
}

export interface VitalisContext {
  /** The rendered record, sent to the function as `vitalisContext`. */
  text: string;
  /** Section headers present, in order — for tests and debugging. */
  sections: string[];
  /** The structured record (schema v1), sent as `vitalisRecord`. */
  record: VitalisStructuredRecord;
}

/* ------------------------------------------------------------------ */
/*  Formatting — the record quotes numbers the way the app shows them  */
/* ------------------------------------------------------------------ */

const kcal = (n: number) => `${Math.round(n).toLocaleString("en-US")} kcal`;
const grams = (n: number) => `${Number.isInteger(n) ? n : Math.round(n * 10) / 10} g`;

function macroLine(t: Nutrients): string {
  const bits = [
    kcal(t.kcal),
    `${grams(t.proteinG)} protein`,
    `${grams(t.carbsG)} carbs`,
    `${grams(t.fatG)} fat`,
  ];
  if (typeof t.fibreG === "number") bits.push(`${grams(t.fibreG)} fibre`);
  return bits.join(" · ");
}

function conditionLabel(code: string): string {
  return (HIGH_RISK_CONDITION_LABEL as Record<string, string>)[code] ?? code.replace(/_/g, " ");
}

function symptomLabel(code: string): string {
  return (URGENT_SYMPTOM_LABEL as Record<string, string>)[code] ?? code.replace(/_/g, " ");
}

const PATTERN_WORDS: Record<string, string> = {
  omnivore: "omnivore (eats everything)",
  vegetarian: "vegetarian (dairy, no egg, no meat or fish)",
  vegan: "vegan (no animal products)",
  eggetarian: "eggetarian (vegetarian plus eggs, no meat or fish)",
  pescatarian: "pescatarian (vegetarian plus fish)",
  other: "a pattern they described as 'other'",
};

const ACTIVITY_WORDS: Record<string, string> = {
  sedentary: "sedentary",
  light: "lightly active",
  moderate: "moderately active",
  active: "active",
  very_active: "very active",
};

const EMOTIONAL_EATING_WORDS: Record<number, string> = {
  1: "rarely",
  2: "sometimes",
  3: "about half the time",
  4: "often",
  5: "very often",
};

/* ------------------------------------------------------------------ */
/*  The builder                                                        */
/* ------------------------------------------------------------------ */

export function buildVitalisContext(input: VitalisContextInput): VitalisContext {
  const sections: string[] = [];
  const out: string[] = [];
  const section = (title: string, lines: string[]) => {
    if (lines.length === 0) return;
    sections.push(title);
    out.push(`## ${title}`, ...lines, "");
  };

  const a = input.assessment.answers;

  /* ---------------------------- the person ---------------------------- */
  const person: string[] = [];
  if (input.assessment.status !== "complete") {
    person.push(
      input.assessment.status === "in_progress"
        ? "Their Assessment is started but NOT completed, treat every answer below as provisional, and do not treat missing answers as facts about them."
        : "They have NOT completed their Assessment yet. You do not know their goal, eating pattern or safety answers, ask rather than assume, and never fill a gap with a typical value.",
    );
  } else if (input.assessment.completedAt) {
    person.push(
      `Assessment completed on ${input.assessment.completedAt.slice(0, 10)}. Its answers below are the person's own words to Bloom.`,
    );
  }
  const basics: string[] = [];
  if (a.ageYears !== null) basics.push(`age ${a.ageYears}`);
  if (a.sex !== "unspecified") basics.push(`sex ${a.sex}`);
  if (a.heightCm !== null) basics.push(`height ${a.heightCm} cm`);
  if (a.weightKg !== null) basics.push(`weight ${a.weightKg} kg`);
  if (basics.length > 0) person.push(`Body basics (from the Assessment): ${basics.join(", ")}.`);
  if (a.goal) person.push(`Goal: ${GOAL_LABEL[a.goal]}${a.targetWeightKg !== null ? `, aiming for ${a.targetWeightKg} kg` : ""}${a.rateKgPerWeek !== null ? ` at about ${a.rateKgPerWeek} kg a week` : ""}.`);
  if (a.activity) person.push(`Activity: ${ACTIVITY_WORDS[a.activity] ?? a.activity}.`);
  if (a.dietaryPattern) person.push(`Eating pattern: ${PATTERN_WORDS[a.dietaryPattern] ?? a.dietaryPattern}. This is a hard rule for anything you suggest.`);
  if (a.mealsPerDay !== null) person.push(`They eat ${a.mealsPerDay} meals a day.`);
  if (a.allergies.length > 0) person.push(`Allergies: ${a.allergies.join(", ")}, never suggest these.`);
  if (a.intolerances.length > 0) person.push(`Intolerances: ${a.intolerances.join(", ")}.`);
  if (a.dislikedFoods.length > 0) person.push(`Foods they dislike: ${a.dislikedFoods.join(", ")}, do not suggest these.`);
  if (a.cuisines.length > 0) person.push(`Cuisines they enjoy: ${a.cuisines.join(", ")}.`);
  if (a.foodBudget !== null) person.push(`Meal budget preference: tier ${a.foodBudget} of 3 (1 is everyday, 3 is rich), the plan and dishes already respect it.`);
  if (a.sleepHoursTypical !== null) person.push(`They say they typically sleep about ${a.sleepHoursTypical} hours (an Assessment answer, not a measurement).`);
  /* The behavioural answers (spec §10) — the person's own words about
   * how eating goes for them, stated factually so explanations can
   * acknowledge them. Context for care, never a diagnosis. */
  if (a.emotionalEating !== null) {
    const words = EMOTIONAL_EATING_WORDS[a.emotionalEating];
    if (words) {
      person.push(
        a.emotionalEating >= 4
          ? `They told Bloom eating ${words} follows their feelings. Be gentle about it: never frame food as failure, and never treat a hard day as a broken plan.`
          : `They told Bloom eating ${words} follows their feelings.`,
      );
    }
  }
  if (a.pastAttempts.length > 0) {
    person.push(
      `They have tried before: ${a.pastAttempts
        .map((t) =>
          t.failureReasons.length > 0
            ? `${t.approach} (it came unstuck over: ${t.failureReasons.map((r) => (FAILURE_REASON_LABEL[r] ?? r).toLowerCase()).join(", ")})`
            : t.approach,
        )
        .join("; ")}. Do not propose the same shape again without acknowledging why it came unstuck.`,
    );
  }
  /* Safety answers — stated factually, for care, never for diagnosis. */
  if (a.pregnantOrBreastfeeding === true) person.push("They told Bloom they are pregnant or breastfeeding. Be extra careful: no deficit framing, and anything beyond gentle general food guidance goes to their clinician.");
  if (a.eatingDisorderHistory === true) person.push("They told Bloom they have a history of disordered eating. Be especially gentle: never frame food as failure, never push targets or deficits, and let them lead.");
  if (a.unexplainedWeightChange === true) person.push("They reported an unexplained weight change in their Assessment. If it comes up, one calm sentence that it is worth mentioning to a clinician, never speculate about causes.");
  if (a.conditions.length > 0) {
    person.push(
      `Conditions they reported: ${a.conditions.map((c) => conditionLabel(c as HighRiskCondition)).join(", ")}. You may be considerate of these in food suggestions; you may not diagnose, interpret or advise on the conditions themselves.`,
    );
  }
  if (a.takesMedication === true) {
    person.push(
      `They take medication${a.medications.length > 0 ? `: ${a.medications.join(", ")}` : ""}. Never advise on medication, that is their clinician's call.`,
    );
  }
  if (a.symptoms.length > 0) {
    person.push(
      `Symptoms they flagged in the Assessment: ${a.symptoms.map((s) => symptomLabel(s as UrgentSymptom)).join(", ")}. If they raise these, advise seeing a clinician, do not interpret them.`,
    );
  }
  section("THE PERSON: FROM THEIR ASSESSMENT", person);

  /* ----------------------------- targets ------------------------------ */
  if (input.targets) {
    section("TARGETS: COMPUTED BY BLOOM'S ENGINE, QUOTE EXACTLY", [
      `Energy target: ${kcal(input.targets.kcal)} a day. Protein target: ${grams(input.targets.proteinG)} a day.`,
      "These are the only calorie and protein goals you may state for this person.",
    ]);
  } else if (input.targetsBlocked) {
    section("TARGETS", [
      "Bloom's safety gate has NOT cleared nutrition targets for this person. There are no calorie or protein goals to quote, do not state any, estimate any, or work around the gate. If they ask why, say Bloom is being careful with their safety answers and the Assessment is where that gets reviewed.",
    ]);
  } else {
    section("TARGETS", [
      "No targets have been computed yet, there is not enough body information. Do not state calorie or protein goals for this person; if a question needs them, say they come once the Assessment holds enough to compute them honestly.",
    ]);
  }

  /* ------------------------------- plan ------------------------------- */
  if (input.plan) {
    const plan = input.plan;
    const lines = [
      `Plan for ${plan.day}${plan.stale ? ", made earlier and possibly out of date; if it no longer fits, say so rather than defending it" : ""}. Goal: ${plan.goalLabel}. Its targets: ${kcal(plan.targets.kcal)}, ${grams(plan.targets.proteinG)} protein.`,
    ];
    for (const meal of plan.meals) {
      const items = meal.items.length > 0 ? meal.items.join("; ") : (meal.note ?? "nothing composed");
      const dishIds =
        meal.dishIds.length > 0 ? ` Dish ids in this meal, in the order named: ${meal.dishIds.join(", ")}.` : "";
      lines.push(`${meal.meal}: ${items} (meal share ${kcal(meal.kcal)}, ${grams(meal.proteinG)} protein).${dishIds}`);
    }
    for (const note of plan.notes) lines.push(`Plan note: ${note}`);
    section("THEIR CURRENT PLAN", lines);
  } else {
    section("THEIR CURRENT PLAN", [
      "No plan has been generated yet. If they want one, the Nutrition tab builds it deterministically from the Assessment, you can explain what it would use, but you cannot create it yourself in this conversation.",
    ]);
  }

  /* ---------------------------- logged today --------------------------- */
  const today = input.todayLog;
  if (today.entries.length > 0) {
    const lines = today.entries.map(
      (e) => `${e.meal}: ${e.name} - ${kcal(e.kcal)}, ${grams(e.proteinG)} protein.`,
    );
    let totals = `Day so far: ${macroLine(today.totals)}.`;
    if (input.targets) {
      const kcalPct = Math.round((today.totals.kcal / input.targets.kcal) * 100);
      const proteinPct = Math.round((today.totals.proteinG / input.targets.proteinG) * 100);
      totals += ` That is about ${kcalPct}% of the energy target and ${proteinPct}% of the protein target.`;
    }
    lines.push(totals);
    section(`LOGGED TODAY (${today.day})`, lines);
  } else {
    section(`LOGGED TODAY (${today.day})`, ["Nothing logged yet today. Do not describe today as eaten or missed, it simply has no entries yet."]);
  }

  /* ---------------------------- recent days ---------------------------- */
  if (input.recentDays.length > 0) {
    section(
      "RECENT DAYS",
      input.recentDays.map(
        (d) => `${d.day}: ${d.entriesCount} ${d.entriesCount === 1 ? "entry" : "entries"} - ${macroLine(d.totals)}.`,
      ),
    );
  } else {
    section("RECENT DAYS", ["No food logged on earlier days yet, there is no eating history to reason from. Say so rather than implying a pattern."]);
  }

  /* ----------------------------- own foods ----------------------------- */
  if (input.customFoods.length > 0) {
    section(
      "THEIR OWN FOODS (values per 100 g, as they entered them)",
      input.customFoods.map(
        (f) =>
          `${f.name} - ${kcal(f.kcal)}, ${grams(f.proteinG)} protein per 100 g.${f.id ? ` [food id: ${f.id}]` : ""}`,
      ),
    );
  }

  /* ------------------------------- dishes ------------------------------ */
  if (input.dishes.length > 0) {
    section(
      "DISHES IN BLOOM'S LIBRARY THAT SUIT THEM (per serving, computed from verified ingredients)",
      input.dishes.map(
        (d) =>
          `${d.name} (${d.category}), ${kcal(d.kcal)}, ${grams(d.proteinG)} protein.${d.id ? ` [dish id: ${d.id}]` : ""}`,
      ),
    );
  }

  /* --------------------- the structured record (v1) -------------------- */
  const loggedNames: string[] = [];
  for (const e of input.todayLog.entries) {
    if (!loggedNames.includes(e.name)) loggedNames.push(e.name);
  }
  for (const d of input.recentDays) {
    for (const name of d.names ?? []) {
      if (!loggedNames.includes(name)) loggedNames.push(name);
    }
  }
  const record: VitalisStructuredRecord = {
    v: 1,
    pattern: a.dietaryPattern ?? null,
    allergies: [...a.allergies],
    dislikes: [...a.dislikedFoods],
    intolerances: [...a.intolerances],
    safety: {
      pregnantOrBreastfeeding: a.pregnantOrBreastfeeding,
      eatingDisorderHistory: a.eatingDisorderHistory,
      takesMedication: a.takesMedication,
      unexplainedWeightChange: a.unexplainedWeightChange,
      conditions: [...a.conditions],
      symptoms: [...a.symptoms],
    },
    targets: input.targets ? { kcal: input.targets.kcal, proteinG: input.targets.proteinG } : null,
    targetsBlocked: input.targetsBlocked,
    plan: input.plan
      ? {
          day: input.plan.day,
          kcal: input.plan.targets.kcal,
          proteinG: input.plan.targets.proteinG,
          meals: input.plan.meals.map((m) => ({
            meal: m.meal,
            kcal: m.kcal,
            proteinG: m.proteinG,
            items: [...m.items],
            dishIds: [...m.dishIds],
          })),
        }
      : null,
    todayTotals: {
      kcal: input.todayLog.totals.kcal,
      proteinG: input.todayLog.totals.proteinG,
      carbsG: input.todayLog.totals.carbsG,
      fatG: input.todayLog.totals.fatG,
    },
    dishes: input.dishes
      .filter((d): d is typeof d & { id: string } => typeof d.id === "string")
      .map((d) => ({ id: d.id, name: d.name, kcal: d.kcal, proteinG: d.proteinG })),
    foods: input.customFoods
      .filter((f): f is typeof f & { id: string } => typeof f.id === "string")
      .map((f) => ({ id: f.id, name: f.name, kcalPer100g: f.kcal, proteinPer100g: f.proteinG })),
    loggedNames,
  };

  return { text: out.join("\n").trim(), sections, record };
}
