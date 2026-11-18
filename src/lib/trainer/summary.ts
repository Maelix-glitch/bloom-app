/**
 * The trainer/clinician share summary — what a person may choose to
 * show the professional helping them.
 *
 * Two disciplines govern it:
 *
 *   · CONSENT FIRST. The builder takes the consent flag as an input
 *     and returns null without it. There is no code path that builds
 *     a summary "just in case" — no consent, no summary, anywhere.
 *
 *   · NOTHING INVENTED. Every row is composed from the same real
 *     stores the clinician report reads (NutritionReportPage): the
 *     Assessment's answers first, the Trackers body profile as the
 *     per-field fallback, the engine's resolved targets, and the
 *     food log's own week aggregates. A field neither store holds
 *     reads "Not recorded"; targets the engine refused read
 *     "Not set". Averages rest only on days actually logged, and say
 *     how many days they rest on.
 *
 * Pure: records in, rows out. The Profile section renders the rows;
 * `shareSummaryLines` flattens them for a copy/share surface.
 */

import { GOAL_LABEL as ASSESSMENT_GOAL_LABEL } from "@/lib/assessment/questions";
import type { AssessmentAnswers } from "@/lib/assessment/state";
import { ACTIVITY_LABEL, GOAL_LABEL as BODY_GOAL_LABEL, type BodyProfile } from "@/lib/health/body";
import type { WeekAggregates } from "@/lib/nutrition/dayView";
import type { NutritionTargets } from "@/lib/nutrition/targets";

/* The pattern wordings are the Vitalis/Coach digest's own
   (lib/coach/assessmentDigest.ts) — every surface should describe a
   person's pattern the same way. */
const PATTERN_WORDS: Record<string, string> = {
  omnivore: "omnivore (eats everything)",
  vegetarian: "vegetarian (dairy, no egg, no meat or fish)",
  vegan: "vegan (no animal products)",
  eggetarian: "eggetarian (vegetarian plus eggs, no meat or fish)",
  pescatarian: "pescatarian (vegetarian plus fish)",
  other: "a pattern they described as 'other'",
};

export interface ShareSummaryInput {
  /** The person's consent to build/share this summary at all. */
  consent: boolean;
  /** Completed Assessment answers, or null when none is completed. */
  answers: AssessmentAnswers | null;
  /** The Trackers body profile (per-field fallback). */
  profile: BodyProfile;
  /** The engine's resolved targets, or null when it set none. */
  targets: NutritionTargets | null;
  /** The last seven days of the food log, or null when unavailable. */
  week: WeekAggregates | null;
}

export interface ShareSummaryRow {
  label: string;
  value: string;
}

export interface ShareSummary {
  rows: ShareSummaryRow[];
  /** Days with anything logged in the window; null when the log is unavailable. */
  loggedDays: number | null;
}

const NOT_RECORDED = "Not recorded";

export function buildShareSummary(input: ShareSummaryInput): ShareSummary | null {
  if (!input.consent) return null;

  const { answers, profile, targets, week } = input;

  /* Per-field resolution, exactly as the clinician report does it:
     the Assessment's answer wins, the body profile fills what the
     Assessment never recorded, and a field neither holds is
     "Not recorded". */
  const age = answers?.ageYears ?? profile.age;
  const sex = answers && answers.sex !== "unspecified" ? answers.sex : profile.sex;
  const heightCm = answers?.heightCm ?? profile.heightCm;
  const weightKg = answers?.weightKg ?? profile.weightKg;

  const goal = answers?.goal
    ? ASSESSMENT_GOAL_LABEL[answers.goal]
    : BODY_GOAL_LABEL[profile.goal];

  const pattern = answers?.dietaryPattern
    ? (PATTERN_WORDS[answers.dietaryPattern] ?? answers.dietaryPattern)
    : NOT_RECORDED;

  const rows: ShareSummaryRow[] = [
    { label: "Age", value: age !== null ? `${age} years` : NOT_RECORDED },
    { label: "Sex", value: sex !== "unspecified" ? sex : NOT_RECORDED },
    { label: "Height", value: heightCm !== null ? `${heightCm} cm` : NOT_RECORDED },
    { label: "Weight", value: weightKg !== null ? `${weightKg} kg` : NOT_RECORDED },
    { label: "Goal", value: goal },
    { label: "Activity", value: ACTIVITY_LABEL[profile.activity] },
    { label: "Eating pattern", value: pattern },
    {
      label: "Energy target",
      value: targets ? `~${Math.round(targets.kcal)} kcal / day` : "Not set",
    },
    {
      label: "Protein target",
      value: targets ? `~${Math.round(targets.proteinG * 10) / 10} g / day` : "Not set",
    },
    {
      label: "Days logged (last 7)",
      value: week ? `${week.loggedDays} of 7` : NOT_RECORDED,
    },
    {
      label: "Average intake",
      value:
        week && week.avgKcal !== null
          ? `~${week.avgKcal} kcal / day over ${week.loggedDays} logged ${week.loggedDays === 1 ? "day" : "days"}`
          : NOT_RECORDED,
    },
    {
      label: "Average protein",
      value:
        week && week.avgProteinG !== null
          ? `~${week.avgProteinG} g / day over ${week.loggedDays} logged ${week.loggedDays === 1 ? "day" : "days"}`
          : NOT_RECORDED,
    },
  ];

  return { rows, loggedDays: week ? week.loggedDays : null };
}

/** The summary as plain lines, for a copy/share surface. */
export function shareSummaryLines(summary: ShareSummary): string[] {
  return summary.rows.map((row) => `${row.label}: ${row.value}`);
}
