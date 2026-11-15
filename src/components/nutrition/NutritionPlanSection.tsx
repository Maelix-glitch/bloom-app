/**
 * NutritionPlanSection — today's goal-based plan, inside the Nutrition
 * tab (P1, spec §6/§10; P2 renders the composer's layers — Base /
 * Protein / Vegetables / Finishing — and its day-level mix notes).
 *
 * Every state names its next action, and every refusal is rendered as
 * plainly as the engine states it: a safety block shows the classifier's
 * own words and points at a professional; missing inputs are listed, not
 * papered over. When a plan exists, its numbers arrive already computed
 * by the lib (targets, splits, suggestion nutrients) and every suggestion
 * wears its provenance badge — this component formats and arranges, it
 * never derives a nutrient value. Logging a suggestion goes through the
 * hook into the lib's normal entry path, so the entry keeps the food's
 * provenance and records the plan as its source.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePlan } from "@/hooks/usePlan";
import { GOAL_LABEL } from "@/lib/assessment/questions";
import { SAFETY_DISCLAIMER } from "@/lib/vitalis/domain/safety";
import { provenanceLabel, type PlanMeal, type PlanSuggestion, type SuggestionLayer } from "@/lib/nutrition";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { FoodPhoto } from "./FoodPhoto";
import { MEAL_LABEL, formatGrams, nutrientLine } from "./input";

/** Layer display order and labels for a composed main meal (P2). Snack
 *  items and pre-P2 plans carry no main-meal layers and render flat. */
const LAYER_SECTIONS: readonly { layer: SuggestionLayer; label: string }[] = [
  { layer: "base", label: "Base" },
  { layer: "protein", label: "Protein" },
  { layer: "vegetables", label: "Vegetables" },
  { layer: "finishing", label: "Finishing" },
];

function formatPlanDay(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function NutritionPlanSection() {
  const { state, generate, logSuggestion } = usePlan();
  const [logged, setLogged] = useState<ReadonlySet<string>>(new Set());
  const [logError, setLogError] = useState<string | null>(null);

  const log = (meal: PlanMeal, suggestion: PlanSuggestion) => {
    const entry = logSuggestion(meal, suggestion);
    if (!entry) {
      setLogError(
        `“${suggestion.name}” isn't in your foods any more, so it can't be logged. Regenerate the plan and Bloom will suggest from what you have now.`,
      );
      return;
    }
    setLogError(null);
    setLogged((prev) => new Set(prev).add(`${meal.meal}:${suggestion.foodId}`));
  };

  if (state.kind === "refused") {
    const refusal = state.refusal;
    return (
      <section className="nut-day-card" aria-label="Your plan for today">
        <p className="home-eyebrow">Your plan</p>
        {refusal.kind === "safety_blocked" ? (
          <div className="mt-2">
            <h2 className="font-display text-[length:var(--text-section)] text-foreground">
              Bloom won't build a diet plan from these answers
            </h2>
          {refusal.findings.map((finding) => (
            <p
              key={finding.ruleId}
              className="mt-2 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground"
            >
              {finding.summary}
            </p>
          ))}
          {refusal.requiresProfessionalReview ? (
            <p className="mt-2 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
              The right next step is a conversation with a qualified professional — your doctor
              or a registered dietitian — who can set targets with your full picture in view.
            </p>
          ) : null}
            <p className="nut-note">
              If your answers have changed, you can update them in the Assessment on your{" "}
              <Link to="/profile" className="nut-inline-link">
                Profile
              </Link>
              . Logging your food still works exactly the same — only the plan is paused.{" "}
              {SAFETY_DISCLAIMER}
            </p>
          </div>
        ) : (
          <div className="mt-2">
            <h2 className="font-display text-[length:var(--text-section)] text-foreground">
              Not enough to build a plan Bloom can stand behind
            </h2>
            <p className="mt-2 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
              A plan is only worth following if every number in it is really yours. Bloom still
              needs:
            </p>
            <ul className="mt-2 list-disc pl-5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
              {refusal.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="nut-note">
              Add them in the Assessment on your{" "}
              <Link to="/profile" className="nut-inline-link">
                Profile
              </Link>{" "}
              or in your body numbers on{" "}
              <Link to="/trackers" className="nut-inline-link">
                Trackers
              </Link>
              , then come back and create your plan.
            </p>
          </div>
        )}
      </section>
    );
  }

  if (state.kind === "can_generate") {
    return (
      <section className="nut-day-card" aria-label="Your plan for today">
        <p className="home-eyebrow">Your plan</p>
        <div className="mt-2">
          <h2 className="font-display text-[length:var(--text-section)] text-foreground">
            A plan for your goal, built from your numbers
          </h2>
          <p className="mt-2 max-w-[56ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            Bloom computes your daily targets deterministically — no AI, no invented numbers —
            splits them across your meals, and suggests foods only from your own foods and USDA
            reference data, each one labelled with its source.
          </p>
          <div className="mt-4">
            <Button type="button" onClick={() => generate()}>
              Create my plan
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (state.kind === "outdated") {
    const plan = state.plan;
    return (
      <section className="nut-day-card" aria-label="Your plan for today">
        <p className="home-eyebrow">Your plan</p>
        <div className="mt-2">
          <h2 className="font-display text-[length:var(--text-section)] text-foreground">
            This plan was made for {formatPlanDay(plan.day)}
          </h2>
          <p className="mt-2 max-w-[56ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            It aimed at ~{Math.round(plan.targets.kcal)} kcal and{" "}
            {formatGrams(plan.targets.proteinG)} g of protein for{" "}
            {GOAL_LABEL[plan.goal].toLowerCase()}. Plans are built for a single day — create
            today's to follow it now.
          </p>
          <div className="mt-4">
            <Button type="button" onClick={() => generate()}>
              Create today's plan
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const suggestionItem = (meal: PlanMeal, suggestion: PlanSuggestion) => {
    const key = `${meal.meal}:${suggestion.foodId}`;
    const isLogged = logged.has(key);
    return (
      <li key={key} className="nut-entry">
        <FoodPhoto foodId={suggestion.foodId} name={suggestion.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[length:var(--text-callout)] font-medium text-foreground">
              {suggestion.name}
            </p>
            <ProvenanceBadge
              kind={suggestion.provenance.kind}
              label={provenanceLabel(suggestion.provenance)}
            />
          </div>
          <p className="mt-0.5 text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
            {formatGrams(suggestion.grams)} g · {nutrientLine(suggestion.nutrients)}
          </p>
        </div>
        <div className="shrink-0">
          {isLogged ? (
            <span className="nut-chip" data-selected>
              <Check className="size-3.5" aria-hidden /> Logged
            </span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label={`Log ${suggestion.name} to ${MEAL_LABEL[meal.meal]}`}
              onClick={() => log(meal, suggestion)}
            >
              <Plus className="size-4" aria-hidden /> Log this
            </Button>
          )}
        </div>
      </li>
    );
  };

  const { plan, staleness } = state;
  return (
    <section className="nut-day-card" aria-label="Your plan for today">
      <p className="home-eyebrow">Your plan</p>
      <div className="mt-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[length:var(--text-section)] text-foreground">
              {GOAL_LABEL[plan.goal]}
            </h2>
            <p className="mt-1 text-[length:var(--text-callout)] tabular-nums text-foreground">
              ~{Math.round(plan.targets.kcal)} kcal · {formatGrams(plan.targets.proteinG)} g
              protein across the day
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => generate()}>
            <RefreshCw className="size-4" aria-hidden /> Regenerate
          </Button>
        </div>

        {staleness.stale ? (
          <div className="nut-plan-stale" role="status">
            {staleness.changed.includes("the plan method improved") ? (
              <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
                The plan method improved since this plan was made — regenerate to get the new
                composition.
              </p>
            ) : null}
            {staleness.changed.filter((c) => c !== "the plan method improved").length > 0 ? (
              <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
                Since this plan was made,{" "}
                {joinNames(staleness.changed.filter((c) => c !== "the plan method improved"))}{" "}
                changed — the plan below still uses the older numbers. Regenerate to bring it up
                to date.
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="nut-note">
          Targets are estimates from your body numbers (Mifflin–St Jeor) — a guide for the day,
          not a prescription.
          {plan.targetsSource === "body_profile"
            ? " This plan is built from your Trackers body numbers — the same targets that page shows."
            : ""}
        </p>

        {plan.cautions.length > 0 ? (
          <div className="mt-3">
            <p className="nut-group-label">Worth knowing</p>
            {plan.cautions.map((caution) => (
              <p key={caution} className="nut-note">
                {caution}
              </p>
            ))}
          </div>
        ) : null}

        {plan.notes.length > 0 ? (
          <div className="mt-3">
            <p className="nut-group-label">Today's mix</p>
            {plan.notes.map((note) => (
              <p key={note} className="nut-note">
                {note}
              </p>
            ))}
          </div>
        ) : null}

        {plan.meals.map((meal) => (
          <section key={meal.meal} aria-label={MEAL_LABEL[meal.meal]} className="nut-meal">
            <div className="nut-meal-head">
              <h3 className="nut-meal-title">{MEAL_LABEL[meal.meal]}</h3>
              <span className="text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
                {Math.round(meal.kcal)} kcal · {formatGrams(meal.proteinG)} g protein
              </span>
            </div>
            {meal.suggestions.length === 0 ? (
              <p className="nut-note">{meal.note}</p>
            ) : (
              <>
                {meal.meal !== "snack" && meal.suggestions.some((s) => s.layer) ? (
                  LAYER_SECTIONS.map(({ layer, label }) => {
                    const items = meal.suggestions.filter((s) => s.layer === layer);
                    if (items.length === 0) return null;
                    return (
                      <div key={layer}>
                        <p className="nut-group-label">{label}</p>
                        <ul className="divide-y divide-border-subtle">
                          {items.map((suggestion) => suggestionItem(meal, suggestion))}
                        </ul>
                      </div>
                    );
                  })
                ) : (
                  <ul className="divide-y divide-border-subtle">
                    {meal.suggestions.map((suggestion) => suggestionItem(meal, suggestion))}
                  </ul>
                )}
                {meal.note ? <p className="nut-note">{meal.note}</p> : null}
              </>
            )}
          </section>
        ))}

        {logError ? (
          <p className="nut-error mt-3" role="alert">
            {logError}
          </p>
        ) : null}

        <p className="nut-note">
          Suggestions are starting points from foods with known values. Swap anything for what
          you actually eat — and log that instead. What you log is what your totals above will
          show.
        </p>
      </div>
    </section>
  );
}
