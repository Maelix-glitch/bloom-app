/**
 * Vitalis action proposals — the client half of phase 4.
 *
 * The server validates proposals against the record and returns the
 * survivors; `askVitalis` re-validates them against this client's own
 * record before the window ever sees them. What lives here:
 *
 *   · `describeProposal` — the confirm card's words. A card is the
 *     ONLY route from a proposal to a write: nothing in this module
 *     (or anywhere in the Vitalis window) applies a proposal without
 *     the person's tap on its card.
 *   · `assessmentStateWithChange` — the surgical answers patch an
 *     approved assessment change applies through: status, step,
 *     consents and every other answer preserved exactly, the same
 *     pattern the plan hook's setGoal set.
 *   · `reportActionResult` — the fire-and-forget outcome report the
 *     function shape-validates (phase 5). A failed report is silent:
 *     it must never break the window, and a missing report is not an
 *     offence — only a malformed one is.
 */

import { GOAL_LABEL } from "@/lib/assessment/questions";
import type { AssessmentState } from "@/lib/assessment/state";
import { COACH_FUNCTION } from "@/lib/coach/edge";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type {
  VitalisActionProposal,
  VitalisRecordData,
} from "../../../supabase/functions/coach/vitalis-core";

const PATTERN_WORDS: Record<string, string> = {
  omnivore: "omnivore (eats everything)",
  vegetarian: "vegetarian",
  vegan: "vegan",
  eggetarian: "eggetarian",
  pescatarian: "pescatarian",
  other: "other",
};

const BUDGET_WORDS: Record<string, string> = {
  "1": "everyday (tier 1 of 3)",
  "2": "mid-range (tier 2 of 3)",
  "3": "rich (tier 3 of 3)",
  null: "no preference",
};

export interface ProposalDescription {
  title: string;
  detail: string;
  confirmLabel: string;
}

export function describeProposal(
  proposal: VitalisActionProposal,
  record: VitalisRecordData,
): ProposalDescription {
  switch (proposal.action) {
    case "log_dish": {
      const dish = record.dishes.find((d) => d.id === proposal.dishId);
      const name = dish?.name ?? "that dish";
      return {
        title: `Log ${name}`,
        detail: dish
          ? `One serving for ${proposal.meal} — ${Math.round(dish.kcal)} kcal, ${dish.proteinG} g protein. Added to today's food log when you confirm.`
          : `One serving for ${proposal.meal}. Added to today's food log when you confirm.`,
        confirmLabel: "Log it",
      };
    }
    case "log_food": {
      const food = record.foods.find((f) => f.id === proposal.foodId);
      const name = food?.name ?? "that food";
      return {
        title: `Log ${name}`,
        detail: `${proposal.grams} g for ${proposal.meal}. Added to today's food log when you confirm.`,
        confirmLabel: "Log it",
      };
    }
    case "compose_plan":
      return {
        title: "Compose today's plan",
        detail:
          "Bloom's engine builds today's plan from your assessment and targets — the same plan the Nutrition tab would compose. Your current plan is replaced only when you confirm.",
        confirmLabel: "Compose plan",
      };
    case "swap_dish": {
      const from = record.dishes.find((d) => d.id === proposal.fromDishId);
      const to = record.dishes.find((d) => d.id === proposal.toDishId);
      /* The from-dish lives in the plan; the record's dish list is
         capped, so recover its name from the plan meal's items (dishes
         are listed first, in dishIds order) when it is not there. */
      const planMeal = record.plan?.meals.find((m) => m.meal === proposal.meal);
      const fromIndex = planMeal?.dishIds.indexOf(proposal.fromDishId) ?? -1;
      const fromItem = fromIndex >= 0 ? planMeal?.items[fromIndex] : undefined;
      const fromName =
        from?.name ?? (fromItem ? fromItem.replace(/ \(dish\)$/, "") : "a dish in your plan");
      const toName = to?.name ?? "another dish";
      return {
        title: `Swap ${fromName} for ${toName}`,
        detail: to
          ? `In your ${proposal.meal} plan, ${toName} (${Math.round(to.kcal)} kcal, ${to.proteinG} g protein per serving) takes ${fromName}'s place. Your targets do not change — only the dish does, and only when you confirm.`
          : `In your ${proposal.meal} plan, ${toName} takes ${fromName}'s place. Your targets do not change — only the dish does, and only when you confirm.`,
        confirmLabel: "Swap dish",
      };
    }
    case "propose_assessment_change": {
      const { field, value } = proposal;
      const detail =
        field === "goal"
          ? `Your goal becomes "${GOAL_LABEL[value as keyof typeof GOAL_LABEL] ?? String(value)}". Your plan and targets read from this — the plan itself is not regenerated until you ask.`
          : field === "dietaryPattern"
            ? `Your eating pattern becomes ${PATTERN_WORDS[String(value)] ?? String(value)}. Dishes and plans honour it from the next build.`
            : field === "mealsPerDay"
              ? `Your assessment will say you eat ${String(value)} meals a day.`
              : field === "foodBudget"
                ? `Your meal budget preference becomes ${BUDGET_WORDS[String(value)] ?? String(value)}.`
                : field === "addAllergy"
                  ? `"${String(value)}" is added to your allergy list. Vitalis and the plan engine will never suggest it again.`
                  : `"${String(value)}" is added to your disliked foods. Vitalis and the plan engine will keep it off your plate.`;
      return {
        title: "Change your assessment",
        detail,
        confirmLabel: "Apply change",
      };
    }
  }
}

/**
 * The answers patch an approved assessment change applies. Mirrors
 * the plan hook's surgical setGoal: only the named answer moves;
 * status, step, consents and timestamps of record are preserved
 * (updatedAt moves, as any honest edit's would). Null when the
 * field/value pair is not one the allowlist would have produced —
 * the apply path re-checks rather than trusting the card.
 */
export function assessmentStateWithChange(
  state: AssessmentState,
  proposal: Extract<VitalisActionProposal, { action: "propose_assessment_change" }>,
  now: string,
): AssessmentState | null {
  const { field, value } = proposal;
  const answers = { ...state.answers };
  switch (field) {
    case "goal":
      if (typeof value !== "string" || !(value in GOAL_LABEL)) return null;
      answers.goal = value as keyof typeof GOAL_LABEL;
      break;
    case "dietaryPattern":
      if (typeof value !== "string" || !(value in PATTERN_WORDS)) return null;
      answers.dietaryPattern = value as AssessmentState["answers"]["dietaryPattern"];
      break;
    case "mealsPerDay":
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 6) {
        return null;
      }
      answers.mealsPerDay = value;
      break;
    case "foodBudget":
      if (value !== null && value !== 1 && value !== 2 && value !== 3) return null;
      answers.foodBudget = value as 1 | 2 | 3 | null;
      break;
    case "addDislikedFood": {
      if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 60) {
        return null;
      }
      const item = value.trim();
      if (!answers.dislikedFoods.includes(item)) {
        answers.dislikedFoods = [...answers.dislikedFoods, item];
      }
      break;
    }
    case "addAllergy": {
      if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 60) {
        return null;
      }
      const item = value.trim();
      if (!answers.allergies.includes(item)) {
        answers.allergies = [...answers.allergies, item];
      }
      break;
    }
    default:
      return null;
  }
  return { ...state, answers, updatedAt: now };
}

/** Report a confirmed action's outcome to the function (phase 5's
 *  shape-validated report). Fire-and-forget by design. */
export function reportActionResult(action: string, ok: boolean): void {
  if (!hasSupabaseConfig) return;
  try {
    void supabase.functions
      .invoke(COACH_FUNCTION, {
        body: { action: "vitalis-action-result", actionResult: { action, ok } },
      })
      .catch(() => {
        /* a lost report is not an offence and never surfaces */
      });
  } catch {
    /* the window's work is done either way */
  }
}
