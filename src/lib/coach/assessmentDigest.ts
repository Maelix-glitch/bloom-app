/**
 * The Coach's view of the Assessment — a compact, factual digest.
 *
 * Vitalis (the orb) has always read the Assessment through
 * `buildVitalisContext`; the regular Coach never saw it, so a person
 * could tell Bloom their goal, their eating pattern and their
 * allergies in the Assessment and then have to repeat all of it to the
 * Coach. This digest closes that gap — and only that gap. It carries
 * exactly:
 *
 *   · the completion date;
 *   · the goal (with target weight / pace when stated);
 *   · the dietary pattern, the meal budget tier, the meals per day;
 *   · the safety-relevant facts the person recorded — allergies,
 *     intolerances, disliked foods, reported conditions, pregnancy,
 *     disordered-eating history, unexplained weight change,
 *     medication, flagged symptoms.
 *
 * Nothing else. Body basics, activity and the sleep answers stay out:
 * the Coach's own record (`facts`) already speaks to the person's
 * days, and this digest exists so the Coach knows what the person
 * *decided and declared*, not to duplicate their measurements. An
 * assessment that is not complete produces no digest at all — a
 * half-finished assessment is provisional, and the Coach must not
 * treat it as settled fact.
 *
 * Pure: a state in, a string (or null) out. The edge function folds
 * the digest into the Coach's context under instructions to use only
 * what is written here (see `coachAssessmentSection` in the shared
 * core) — the Coach never computes or invents assessment facts.
 */

import { GOAL_LABEL } from "@/lib/assessment/questions";
import type { AssessmentState } from "@/lib/assessment/state";
import {
  HIGH_RISK_CONDITION_LABEL,
  URGENT_SYMPTOM_LABEL,
  type HighRiskCondition,
  type UrgentSymptom,
} from "@/lib/vitalis/domain/safety";

/* The pattern wordings are Vitalis context's own (lib/vitalis-ai/
   context.ts) — the two AIs should describe a pattern the same way. */
const PATTERN_WORDS: Record<string, string> = {
  omnivore: "omnivore (eats everything)",
  vegetarian: "vegetarian (dairy, no egg, no meat or fish)",
  vegan: "vegan (no animal products)",
  eggetarian: "eggetarian (vegetarian plus eggs, no meat or fish)",
  pescatarian: "pescatarian (vegetarian plus fish)",
  other: "a pattern they described as 'other'",
};

/** A digest line never runs away: lists are capped in count and every
 *  line in length, so a maximal assessment stays a compact digest.
 *  (The server caps the whole digest again — defence in depth.) */
const MAX_LIST_ITEMS = 12;
const MAX_LINE_CHARS = 320;

function line(text: string): string {
  return text.length > MAX_LINE_CHARS ? `${text.slice(0, MAX_LINE_CHARS - 1)}…` : text;
}

/** Free-text answers ride inside single digest lines: whitespace —
 *  newlines above all — collapses, so a recorded answer can never
 *  break out of its line and pose as a new section of the context. */
const cleanText = (s: string) => s.replace(/\s+/g, " ").trim();

function listLine(label: string, items: readonly string[]): string | null {
  const cleaned = items.map(cleanText).filter(Boolean);
  if (cleaned.length === 0) return null;
  return line(`${label}: ${cleaned.slice(0, MAX_LIST_ITEMS).join(", ")}.`);
}

function conditionLabel(code: string): string {
  return (HIGH_RISK_CONDITION_LABEL as Record<string, string>)[code] ?? code.replace(/_/g, " ");
}

function symptomLabel(code: string): string {
  return (URGENT_SYMPTOM_LABEL as Record<string, string>)[code] ?? code.replace(/_/g, " ");
}

export function buildAssessmentDigest(state: AssessmentState): string | null {
  if (state.status !== "complete") return null;
  const a = state.answers;
  const lines: string[] = [];

  if (state.completedAt) {
    lines.push(`Assessment completed on ${state.completedAt.slice(0, 10)}.`);
  }
  if (a.goal) {
    const pace =
      a.targetWeightKg !== null
        ? `, aiming for ${a.targetWeightKg} kg`
        : "";
    const rate = a.rateKgPerWeek !== null ? ` at about ${a.rateKgPerWeek} kg a week` : "";
    lines.push(line(`Goal: ${GOAL_LABEL[a.goal]}${pace}${rate}.`));
  }
  if (a.dietaryPattern) {
    lines.push(`Eating pattern: ${PATTERN_WORDS[a.dietaryPattern] ?? a.dietaryPattern}.`);
  }
  if (a.foodBudget !== null) {
    lines.push(`Meal budget preference: tier ${a.foodBudget} of 3 (1 is everyday, 3 is rich).`);
  }
  if (a.mealsPerDay !== null) {
    lines.push(`They eat ${a.mealsPerDay} meals a day.`);
  }

  /* Safety-relevant facts — only what the person affirmatively
     recorded. An unanswered question (null) is not a fact and is
     never stated as one. */
  const allergies = listLine("Allergies", a.allergies);
  if (allergies) lines.push(allergies);
  const intolerances = listLine("Intolerances", a.intolerances);
  if (intolerances) lines.push(intolerances);
  const dislikes = listLine("Foods they dislike", a.dislikedFoods);
  if (dislikes) lines.push(dislikes);
  if (a.conditions.length > 0) {
    const conditions = listLine(
      "Conditions they reported",
      a.conditions.map((c) => conditionLabel(c as HighRiskCondition)),
    );
    if (conditions) lines.push(conditions);
  }
  if (a.pregnantOrBreastfeeding === true) {
    lines.push("They told Bloom they are pregnant or breastfeeding.");
  }
  if (a.eatingDisorderHistory === true) {
    lines.push("They told Bloom they have a history of disordered eating.");
  }
  if (a.unexplainedWeightChange === true) {
    lines.push("They reported an unexplained weight change.");
  }
  if (a.takesMedication === true) {
    const meds = a.medications.map(cleanText).filter(Boolean);
    lines.push(
      meds.length > 0
        ? line(`They take medication: ${meds.slice(0, MAX_LIST_ITEMS).join(", ")}.`)
        : "They take medication.",
    );
  }
  if (a.symptoms.length > 0) {
    const symptoms = listLine(
      "Symptoms they flagged",
      a.symptoms.map((s) => symptomLabel(s as UrgentSymptom)),
    );
    if (symptoms) lines.push(symptoms);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}
