/**
 * NutritionPlanSection — today's goal-based plan (P1/P2), restyled as
 * the prototype's PlanPanel (N-UI): goal chips, "Compose again", meal
 * cards in a two-column grid with a dish title derived mechanically
 * from the meal's own base + protein items (only what is in the plan —
 * the Coach dish-name rule), items in layer order, and a "Log this
 * meal" footer that bulk-logs duplicate-safely through the plan-log
 * record.
 *
 * Every refusal and safety state is Bloom's, unchanged: a safety block
 * shows the classifier's own words and points at a professional;
 * missing inputs are listed, not papered over. Goal chips write
 * through the same goal source the engine reads (see usePlan.setGoal)
 * and never regenerate silently — the plan goes stale by name until
 * the explicit Compose again tap.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAssessment } from "@/hooks/useAssessment";
import { useNutrition } from "@/hooks/useNutrition";
import { usePlan } from "@/hooks/usePlan";
import { useSession } from "@/hooks/useSession";
import { GOAL_LABEL, GOAL_OPTIONS } from "@/lib/assessment/questions";
import { toHealthProfile } from "@/lib/assessment/state";
import { SAFETY_DISCLAIMER } from "@/lib/vitalis/domain/safety";
import {
  dishIdeaFor,
  dishNutrients,
  displayNameForFoodId,
  goalProfileOf,
  logDish,
  provenanceLabel,
  sumNutrients,
  type Dish,
  type PlanGoalProfile,
  type PlanMeal,
  type PlanSuggestion,
  type SuggestionLayer,
} from "@/lib/nutrition";
import { DishPhoto } from "./DishPhoto";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { FoodPhoto } from "./FoodPhoto";
import { MEAL_LABEL, formatGrams } from "./input";

/** Layer display order and labels for a composed main meal (P2). Snack
 *  items and pre-P2 plans carry no main-meal layers and render flat. */
const LAYER_SECTIONS: readonly { layer: SuggestionLayer; label: string }[] = [
  { layer: "base", label: "Base" },
  { layer: "protein", label: "Protein" },
  { layer: "vegetables", label: "Vegetables" },
  { layer: "finishing", label: "Finishing" },
];

const GOAL_CHIPS: readonly PlanGoalProfile[] = ["lose", "maintain", "gain", "recomp"];

function formatPlanDay(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The meal card's dish title, derived mechanically from the meal's own
 * items: the base item "with" its protein items, named by their
 * friendly display names (D4 — the cook's names, not the USDA source
 * descriptions those stay in the provenance layer). Nothing is
 * invented — a meal with no base is titled by its protein items, a
 * snack by its items, and a meal with no items gets no title at all
 * (its note renders instead).
 */
function dishTitleFor(meal: PlanMeal): string | null {
  if (meal.suggestions.length === 0) return null;
  const nameOf = (s: PlanSuggestion) => displayNameForFoodId(s.foodId, s.name).en;
  const base = meal.suggestions.filter((s) => s.layer === "base");
  const protein = meal.suggestions.filter((s) => s.layer === "protein");
  if (base.length > 0 && protein.length > 0) {
    return `${nameOf(base[0]!)} with ${joinNames(protein.map(nameOf))}`;
  }
  const named = (protein.length > 0 ? protein : meal.suggestions).map(nameOf);
  return joinNames(named);
}

function GoalChips({
  currentGoal,
  onSelect,
}: {
  currentGoal: PlanGoalProfile | null;
  onSelect: (goal: PlanGoalProfile) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Your goal">
      {GOAL_CHIPS.map((goal) => {
        const option = GOAL_OPTIONS.find((o) => o.value === goal);
        return (
          <button
            key={goal}
            type="button"
            className="nut-chip nut-chip-solid"
            data-selected={currentGoal === goal || undefined}
            aria-pressed={currentGoal === goal}
            title={option?.hint}
            onClick={() => onSelect(goal)}
          >
            {GOAL_LABEL[goal]}
          </button>
        );
      })}
    </div>
  );
}

export function NutritionPlanSection() {
  const { state, generate, logSuggestion, suggestionLogged, logMeal, currentGoal, setGoal } =
    usePlan();
  const assessment = useAssessment();
  const session = useSession();
  const nutrition = useNutrition();
  const [logError, setLogError] = useState<string | null>(null);

  /* The profile the dish idea is judged against — the same assembly
     the swap suggestions use (the Assessment's domain profile), so a
     dish idea and a swap can never apply different rules. */
  const profile = useMemo(
    () => toHealthProfile(assessment.state, session.userId ?? "local"),
    [assessment.state, session.userId],
  );

  const log = (meal: PlanMeal, suggestion: PlanSuggestion) => {
    const entry = logSuggestion(meal, suggestion);
    if (!entry) {
      setLogError(
        `“${displayNameForFoodId(suggestion.foodId, suggestion.name).en}” isn't in your foods any more, so it can't be logged. Regenerate the plan and Bloom will suggest from what you have now.`,
      );
      return;
    }
    setLogError(null);
  };

  const logWholeMeal = (meal: PlanMeal) => {
    const pending = meal.suggestions.filter((s) => !suggestionLogged(meal, s));
    const logged = logMeal(meal);
    if (logged < pending.length) {
      setLogError(
        "One or more of those foods aren't in your foods any more, so they couldn't be logged. Regenerate the plan and Bloom will suggest from what you have now.",
      );
    } else {
      setLogError(null);
    }
  };

  const chipGoal = currentGoal ? goalProfileOf(currentGoal) : null;

  if (state.kind === "refused") {
    const refusal = state.refusal;
    return (
      <section className="nut-card nut-rise mt-4" aria-label="Your plan for today">
        <p className="eyebrow">Your plan</p>
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
                The right next step is a conversation with a qualified professional — your
                doctor or a registered dietitian — who can set targets with your full picture
                in view.
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
      <section className="nut-card nut-rise mt-4" aria-label="Your plan for today">
        <p className="eyebrow">Your plan</p>
        <div className="mt-2">
          <h2 className="font-display text-[length:var(--text-section)] text-foreground">
            A plan for your goal, built from your numbers
          </h2>
          <p className="mt-2 max-w-[56ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            Bloom computes your daily targets deterministically — no AI, no invented numbers —
            splits them across your meals, and suggests foods only from your own foods and
            USDA reference data, each one labelled with its source.
          </p>
          <GoalChips currentGoal={chipGoal} onSelect={setGoal} />
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
      <section className="nut-card nut-rise mt-4" aria-label="Your plan for today">
        <p className="eyebrow">Your plan</p>
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

  const { plan, staleness } = state;

  const suggestionRow = (meal: PlanMeal, suggestion: PlanSuggestion) => {
    const isLogged = suggestionLogged(meal, suggestion);
    const display = displayNameForFoodId(suggestion.foodId, suggestion.name);
    return (
      <li key={suggestion.foodId} className="nut-entry">
        <FoodPhoto foodId={suggestion.foodId} name={display.en} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className="truncate text-[length:var(--text-callout)] font-medium text-foreground"
              title={display.en}
            >
              {display.en}
              {display.hindi ? <span className="nut-hindi"> ({display.hindi})</span> : null}
            </p>
            <ProvenanceBadge
              kind={suggestion.provenance.kind}
              label={provenanceLabel(suggestion.provenance)}
            />
          </div>
          <p className="mt-0.5 text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
            {formatGrams(suggestion.grams)} g · {Math.round(suggestion.nutrients.kcal)} kcal ·{" "}
            {formatGrams(suggestion.nutrients.proteinG)} g protein
          </p>
        </div>
        <div className="shrink-0">
          {isLogged ? (
            <span className="nut-chip" data-selected>
              <Check className="size-3.5" aria-hidden /> Logged
            </span>
          ) : (
            <button
              type="button"
              className="nut-icon-btn"
              aria-label={`Log ${display.en} to ${MEAL_LABEL[meal.meal]}`}
              onClick={() => log(meal, suggestion)}
            >
              <Plus className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </li>
    );
  };

  const mealCard = (meal: PlanMeal) => {
    const dish = dishTitleFor(meal);
    const sums = sumNutrients(meal.suggestions.map((s) => s.nutrients));
    const allLogged =
      meal.suggestions.length > 0 && meal.suggestions.every((s) => suggestionLogged(meal, s));
    const layered =
      meal.meal !== "snack" && meal.suggestions.some((s) => s.layer);
    return (
      <article key={meal.meal} className="nut-card" aria-label={`${MEAL_LABEL[meal.meal]} plan`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{MEAL_LABEL[meal.meal]}</p>
            {dish ? (
              <h3 className="mt-1.5 truncate font-display text-[21px] leading-tight text-foreground" title={dish}>
                {dish}
              </h3>
            ) : null}
          </div>
          <p className="shrink-0 text-right">
            <span className="font-display text-[20px] text-foreground tabular-nums">
              {Math.round(meal.kcal)}
            </span>{" "}
            <span className="text-[length:var(--text-caption)] text-muted-foreground">kcal</span>
          </p>
        </div>

        {meal.suggestions.length === 0 ? (
          <p className="nut-note">{meal.note}</p>
        ) : (
          <>
            {layered ? (
              LAYER_SECTIONS.map(({ layer, label }) => {
                const items = meal.suggestions.filter((s) => s.layer === layer);
                if (items.length === 0) return null;
                return (
                  <div key={layer} className="mt-3">
                    <p className="nut-group-label">{label}</p>
                    <ul className="divide-y divide-border-subtle">
                      {items.map((s) => suggestionRow(meal, s))}
                    </ul>
                  </div>
                );
              })
            ) : (
              <ul className="mt-2 divide-y divide-border-subtle">
                {meal.suggestions.map((s) => suggestionRow(meal, s))}
              </ul>
            )}
            {meal.note ? <p className="nut-note">{meal.note}</p> : null}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-3.5">
              <p className="text-[length:var(--text-callout)] text-muted-foreground tabular-nums">
                <span className="font-semibold text-[var(--sage)]">
                  {formatGrams(sums.proteinG)} g
                </span>{" "}
                protein
                {sums.fibreG !== undefined ? <> · {formatGrams(sums.fibreG)} g fibre</> : null}
              </p>
              {allLogged ? (
                <span className="inline-flex items-center gap-1.5 text-[length:var(--text-callout)] font-medium text-[var(--sage)]">
                  <Check className="size-4" aria-hidden /> Already logged
                </span>
              ) : (
                <button
                  type="button"
                  className="nut-btn nut-btn-gold nut-btn-sm"
                  onClick={() => logWholeMeal(meal)}
                >
                  Log this meal
                </button>
              )}
            </div>
          </>
        )}
        {dishIdeaRow(meal)}
      </article>
    );
  };

  /* One dish idea per main meal (D4): a library dish that suits the
     person's pattern and passes the plan's own allergy/dislike gates,
     rotating by day. The layered ingredient suggestions above are the
     plan; this is a cookable alternative for the same slot, logged
     through the dish path (a recipe-provenance portion snapshot). No
     qualifying dish → no row — the card is never padded. */
  const dishIdeaRow = (meal: PlanMeal) => {
    if (meal.meal === "snack") return null;
    const idea = dishIdeaFor(profile, plan.day, meal.meal);
    if (!idea) return null;
    const nutrients = dishNutrients(idea).nutrients;
    const logged = nutrition.entries.some(
      (e) =>
        e.day === plan.day &&
        e.meal === meal.meal &&
        e.source === "dish" &&
        e.provenance.kind === "recipe" &&
        e.provenance.sourceId === idea.id,
    );
    return (
      <div className="mt-4 border-t border-border-subtle pt-3.5">
        <p className="nut-group-label">Dish idea</p>
        <div className="mt-2 flex items-center gap-3">
          <DishPhoto dishId={idea.id} name={idea.name.en} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[length:var(--text-callout)] font-medium text-foreground">
              {idea.name.en} <span className="nut-hindi">({idea.name.hindi})</span>
            </p>
            <p className="mt-0.5 text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
              {Math.round(nutrients.kcal)} kcal · {formatGrams(nutrients.proteinG)} g protein
              per serving
            </p>
          </div>
          {logged ? (
            <span className="nut-chip" data-selected>
              <Check className="size-3.5" aria-hidden /> Logged
            </span>
          ) : (
            <button
              type="button"
              className="nut-btn nut-btn-gold nut-btn-sm"
              onClick={() => logDishIdea(meal, idea)}
            >
              Log this dish
            </button>
          )}
        </div>
      </div>
    );
  };

  const logDishIdea = (meal: PlanMeal, dish: Dish) => {
    const entry = logDish(dish, meal.meal, plan.day);
    if (!entry) {
      setLogError(
        `“${dish.name.en}” couldn't be logged — its values fall outside the range the log can store.`,
      );
      return;
    }
    setLogError(null);
  };

  return (
    <section className="nut-card nut-rise mt-4" aria-label="Your plan for today">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Your plan</p>
          <h2 className="mt-1.5 font-display text-[30px] leading-tight text-foreground">
            {GOAL_LABEL[plan.goal]}
          </h2>
          <p className="mt-1 text-[length:var(--text-callout)] tabular-nums text-muted-foreground">
            Composed to land near{" "}
            <span className="font-semibold text-foreground">
              {Math.round(plan.targets.kcal)} kcal
            </span>{" "}
            and{" "}
            <span className="font-semibold text-foreground">
              {formatGrams(plan.targets.proteinG)} g protein
            </span>{" "}
            across the day — your guide is ~{Math.round(plan.targets.kcal)} kcal and ~
            {formatGrams(plan.targets.proteinG)} g.
          </p>
        </div>
        <button
          type="button"
          className="nut-btn nut-btn-ghost nut-btn-sm"
          onClick={() => generate()}
        >
          <RefreshCw className="size-3.5" aria-hidden /> Compose again
        </button>
      </div>

      <GoalChips currentGoal={chipGoal} onSelect={setGoal} />

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

      <div className="mt-5 grid gap-4 md:grid-cols-2">{plan.meals.map(mealCard)}</div>

      {plan.cautions.length > 0 ? (
        <div className="mt-5">
          <p className="nut-group-label">Worth knowing</p>
          {plan.cautions.map((caution) => (
            <p key={caution} className="nut-note">
              {caution}
            </p>
          ))}
        </div>
      ) : null}

      {plan.notes.length > 0 ? (
        <div className="mt-4">
          <p className="nut-group-label">Today's mix</p>
          {plan.notes.map((note) => (
            <p key={note} className="nut-note">
              {note}
            </p>
          ))}
        </div>
      ) : null}

      {logError ? (
        <p className="nut-error mt-3" role="alert">
          {logError}
        </p>
      ) : null}

      <p className="nut-note">
        Plans are composed from USDA-labelled foods and your own, against your targets. They
        are a starting point — log what you actually eat and your totals follow that.
      </p>
    </section>
  );
}
