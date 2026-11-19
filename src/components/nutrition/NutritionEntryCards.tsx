/**
 * Nutrition's two doors — the Today band and the Profile card, in the
 * same component language as the Assessment's (`AssessmentEntry`).
 *
 * Both read today's log through `useNutrition`: when food is logged they
 * show today's kcal against the target (framed as the estimate it is);
 * when nothing is logged — or no target can honestly be computed — they
 * invite rather than invent. Both doors lead to the Nutrition tab; the
 * logging itself happens there.
 */

import { Link } from "@tanstack/react-router";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { Button } from "@/components/ui/button";
import { useNutrition } from "@/hooks/useNutrition";
import { usePlan } from "@/hooks/usePlan";
import { fmtCount, fmtGrams, fmtKcalApprox } from "@/lib/format";
import type { DailyPlan } from "@/lib/nutrition/plan";
import {
  PLAN_LOG_KEY,
  parsePlanLogValue,
  planLoggedEntryIdFrom,
} from "@/lib/nutrition/planLog";
import type { LogEntry, Meal } from "@/lib/nutrition/types";
import { usePrefValue } from "@/lib/prefsStore";
import { MEAL_LABEL } from "./input";

const NO_PLAN_LOG: Record<string, string> = {};

function useTodaySummary() {
  const nutrition = useNutrition();
  const comparison = nutrition.comparison(nutrition.today);
  const count = nutrition.dayLog(nutrition.today).entries.length;
  return { comparison, count };
}

function summaryLine(count: number, kcal: number, proteinG: number): string {
  if (count === 0) return "";
  return `${Math.round(kcal)} kcal · ${fmtGrams(proteinG)} g protein · ${count} ${
    count === 1 ? "food" : "foods"
  } logged`;
}

/* ------------------------- the plan's next meal ------------------------- */

export interface NextPlanMeal {
  meal: Meal;
  label: string;
  name: string;
}

/**
 * The day's next unlogged planned meal (brief v6 Slice 5, M-123), read
 * from the stored plan and the real log — nothing computed, nothing
 * invented. A dish counts as logged by the plan section's own rule (a
 * dish entry for that meal whose recipe provenance names the dish) or
 * by the plan-log record; a food-composed meal counts through the
 * plan-log record for any of its suggestions. Returns the first meal
 * in plan order that still has something unlogged, or null when there
 * is no plan or the whole plan is in the log.
 */
export function nextUnloggedPlanMeal(
  plan: DailyPlan | null,
  entries: readonly LogEntry[],
  planLog: Readonly<Record<string, string>>,
): NextPlanMeal | null {
  if (!plan) return null;
  for (const meal of plan.meals) {
    const headline =
      meal.dishes.find((d) => d.role === "anchor") ?? meal.dishes[0] ?? null;
    const name = headline?.name ?? meal.suggestions[0]?.name ?? null;
    if (!name) continue;
    const dishLogged = meal.dishes.some(
      (dish) =>
        entries.some(
          (e) =>
            e.day === plan.day &&
            e.meal === meal.meal &&
            e.source === "dish" &&
            e.provenance.kind === "recipe" &&
            e.provenance.sourceId === dish.dishId,
        ) || planLoggedEntryIdFrom(planLog, entries, plan.day, meal.meal, dish.dishId) !== null,
    );
    const suggestionLogged = meal.suggestions.some(
      (s) => planLoggedEntryIdFrom(planLog, entries, plan.day, meal.meal, s.foodId) !== null,
    );
    if (dishLogged || suggestionLogged) continue;
    return { meal: meal.meal, label: MEAL_LABEL[meal.meal], name };
  }
  return null;
}

/* ---------------------------------- Today ---------------------------------- */

export function NutritionTodayCard() {
  const { comparison, count } = useTodaySummary();
  const { totals, targets } = comparison;
  const hasData = count > 0;
  const nutrition = useNutrition();
  const plan = usePlan();
  const planLog = usePrefValue(PLAN_LOG_KEY, parsePlanLogValue, NO_PLAN_LOG);
  const readyPlan = plan.state.kind === "ready" ? plan.state.plan : null;
  const nextMeal = nextUnloggedPlanMeal(readyPlan, nutrition.entries, planLog ?? {});
  const planComplete = readyPlan !== null && nextMeal === null;

  return (
    <section className="home-band" aria-labelledby="home-nutrition-title">
      <div className="flex items-start gap-3 px-2 pb-3 pt-2">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/10 text-gold"
        >
          <BloomIcon name="nutrition" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="home-eyebrow">Nutrition</p>
          <h2 id="home-nutrition-title" className="home-band-title mt-1">
            {hasData
              ? targets
                ? `${fmtCount(totals.kcal)} of your ${fmtKcalApprox(targets.kcal)} target`
                : `${Math.round(totals.kcal)} kcal logged today`
              : "What did you eat today?"}
          </h2>
          {/* The plan's next step, from the stored plan and the real
              log (M-123) — the card names what is next, not just that
              food exists. */}
          {nextMeal ? (
            <p
              className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground"
              data-testid="home-nutrition-next"
            >
              Next: {nextMeal.label} · {nextMeal.name}
            </p>
          ) : planComplete ? (
            <p
              className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground"
              data-testid="home-nutrition-next"
            >
              Every planned meal is in today's log.
            </p>
          ) : null}
          <p className="mt-1 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            {hasData
              ? `${summaryLine(count, totals.kcal, totals.proteinG)}. Every value carries its source — USDA data, your labels, or a marked estimate.`
              : "Log meals and see them against your daily target. Every value is labelled with where it came from — nothing is presented as more certain than it is."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" asChild>
              <Link to="/nutrition">{hasData ? "Open Nutrition" : "Log food"}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Profile --------------------------------- */

export function NutritionProfileCard() {
  const { comparison, count } = useTodaySummary();
  const { totals, targets } = comparison;
  const hasData = count > 0;

  const statusLine = hasData
    ? `Today: ${summaryLine(count, totals.kcal, totals.proteinG)}${
        targets ? `, against a ${fmtKcalApprox(targets.kcal)} target (an estimate from your body numbers)` : ""
      }.`
    : "Nothing logged today yet.";

  return (
    <div className="pf-card pf-card--pad">
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">Nutrition</p>
          <h2 className="pf-title">Food &amp; your target</h2>
        </div>
      </div>
      <p className="max-w-[56ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        What you eat, logged against the day — USDA reference values, your own packet labels,
        and Coach estimates, each labelled as what it is. {statusLine}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" asChild>
          <Link to="/nutrition">{hasData ? "Open Nutrition" : "Log your first food"}</Link>
        </Button>
      </div>
    </div>
  );
}
