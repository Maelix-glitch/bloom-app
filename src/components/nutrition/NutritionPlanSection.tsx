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
 *
 * P3: a meal card's header shows the composed sum of its listed
 * suggestions — never the meal's target split dressed up as a total
 * (the day's targets stay in the section header as the guide) — and
 * the day's dish ideas are picked once, in meal order, each excluded
 * from the next slot so the same dish is never offered twice in a day.
 *
 * P5: a dish-composed meal card IS its dishes — the anchor dish is
 * the card's title, each dish a row with its photo and computed
 * numbers, and tapping a dish unfolds its ingredients (the raw
 * things, per serving) underneath it, with the full recipe one tap
 * further in the dish detail sheet. Simple foods appear only in the
 * subordinate "To complete the day" top-up group. A meal the dish
 * pool could not fill keeps the layered food rendering above, and
 * its D4 dish idea with it.
 *
 * P8: composing runs behind a designed loading state, scoped to
 * this section (never a full-screen takeover): the three honest
 * steps of the work — reading the record, choosing the dishes,
 * balancing the day — shown in order while generation runs, with a
 * short minimum display so the plan's reveal is a reveal, not a
 * flicker. The steps name what the engine actually does; nothing
 * is claimed to happen that does not.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAssessment } from "@/hooks/useAssessment";
import { peekEntitlement } from "@/lib/billing/entitlement";
import { requestPaywall } from "@/lib/billing/paywall";
import { canUse } from "@/lib/billing/plans";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useNutrition } from "@/hooks/useNutrition";
import { usePlan } from "@/hooks/usePlan";
import { useSession } from "@/hooks/useSession";
import { GOAL_LABEL, GOAL_OPTIONS } from "@/lib/assessment/questions";
import { fmtGrams, fmtKcalApprox } from "@/lib/format";
import { formatClock } from "@/lib/smart/usual";
import { toHealthProfile } from "@/lib/assessment/state";
import { SAFETY_DISCLAIMER } from "@/lib/vitalis/domain/safety";
import {
  MAX_TARGET_ADJUSTMENT_KCAL,
  adjustedTargets,
  confirmTargetAdjustment,
  dishIdeaFor,
  dishNutrients,
  displayNameForFoodId,
  estimateExpenditure,
  findDish,
  findUsdaReference,
  foodDisplayName,
  goalProfileOf,
  logDish,
  planLearningFor,
  provenanceLabel,
  sumNutrients,
  type Dish,
  type PlanDish,
  type PlanGoalProfile,
  type PlanMeal,
  type PlanSuggestion,
  type SuggestionLayer,
} from "@/lib/nutrition";
import { DishDetailSheet } from "./DishDetailSheet";
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

/** Dish role labels for a dish-composed meal (P5). The anchor needs no
 *  tag — it is the card's title; the dishes that join it say what they
 *  are. */
const DISH_ROLE_LABEL: Record<PlanDish["role"], string> = {
  anchor: "Main dish",
  base: "Base",
  side: "Side",
};

const GOAL_CHIPS: readonly PlanGoalProfile[] = ["lose", "maintain", "gain", "recomp"];

/** The composing sequence (P8): the steps shown while a plan is
 *  built, and the rhythm they advance on. Generation itself is
 *  synchronous and fast; the minimum display (~1.4 s in total) is
 *  what lets a person register that real work happened — the same
 *  honesty as the Vitalis deliberation stages, at plan scale. */
const COMPOSE_STEPS = ["Reading your record", "Choosing your dishes", "Balancing your day"] as const;
const COMPOSE_STEP_MS = 450;
const COMPOSE_MIN_MS = 1400;

function formatPlanDay(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
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
  const {
    state,
    generate,
    logSuggestion,
    suggestionLogged,
    logMeal,
    currentGoal,
    setGoal,
    engineTdeeKcal,
    targetAdjustment,
    clearTargetAdjustment,
  } = usePlan();
  const assessment = useAssessment();
  const session = useSession();

  /* P8: the composing sequence — the step currently on show, or
     null when no composition is running. The timers are the
     sequence's whole machinery; unmounting clears them, so a
     composition never lands on a section that has gone away. */
  const [composeStep, setComposeStep] = useState<number | null>(null);
  const composeTimers = useRef<number[]>([]);
  useEffect(
    () => () => {
      for (const t of composeTimers.current) window.clearTimeout(t);
    },
    [],
  );

  /* Money System: composing an adaptive plan is a Premium feature.
     A KNOWN free entitlement meets the paywall instead of a new
     plan; an unread entitlement never blocks. The existing plan
     stays fully usable either way — only composing is gated. */
  const compose = () => {
    const entitlement = peekEntitlement();
    if (
      entitlement?.kind === "ready" &&
      !canUse(entitlement.entitlement.tier, "assessment_plan")
    ) {
      requestPaywall("nutrition_plan");
      return;
    }
    if (composeStep !== null) return;
    setComposeStep(0);
    composeTimers.current = [
      window.setTimeout(() => setComposeStep(1), COMPOSE_STEP_MS),
      window.setTimeout(() => setComposeStep(2), COMPOSE_STEP_MS * 2),
      window.setTimeout(() => {
        try {
          generate();
        } finally {
          composeTimers.current = [];
          setComposeStep(null);
        }
      }, COMPOSE_MIN_MS),
    ];
  };
  const nutrition = useNutrition();
  const body = useBodyProfile();
  const [logError, setLogError] = useState<string | null>(null);
  /* P7: the dismissed expenditure proposal's fingerprint — dismissing
     stores nothing; the card simply stays away while the estimate
     behind it is unchanged. */
  const [dismissedProposal, setDismissedProposal] = useState<string | null>(null);
  /* P5: which plan dish's ingredients are unfolded, and which dish's
     full recipe sheet is open (with the plan meal it belongs to, so
     the sheet's Log button files it into the plan's meal). */
  const [expandedDish, setExpandedDish] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<{ dish: Dish; meal: PlanMeal } | null>(null);

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
    /* P5: a dish-composed meal logs its dishes through the dish path
       as well as its food suggestions through the meal path. */
    let failed = false;
    for (const planDish of meal.dishes) {
      if (planDishLogged(meal, planDish)) continue;
      const dish = findDish(planDish.dishId);
      if (!dish || !logDish(dish, meal.meal, plan.day)) failed = true;
    }
    const pending = meal.suggestions.filter((s) => !suggestionLogged(meal, s));
    const logged = logMeal(meal);
    if (failed || logged < pending.length) {
      setLogError(
        "One or more of those foods aren't in your foods any more, so they couldn't be logged. Regenerate the plan and Bloom will suggest from what you have now.",
      );
    } else {
      setLogError(null);
    }
  };

  /* A plan dish counts as logged when today's log for this meal holds
     its dish entry (the dish idea row's own check). */
  const planDishLogged = (meal: PlanMeal, planDish: PlanDish): boolean =>
    nutrition.entries.some(
      (e) =>
        e.day === plan.day &&
        e.meal === meal.meal &&
        e.source === "dish" &&
        e.provenance.kind === "recipe" &&
        e.provenance.sourceId === planDish.dishId,
    );

  const chipGoal = currentGoal ? goalProfileOf(currentGoal) : null;

  /* P8: while a composition runs, the section IS the loading state
     — the plan (or the refusal) renders only when the sequence
     completes. Section-scoped: the rest of the page never moves. */
  if (composeStep !== null) {
    return (
      <section className="nut-card nut-rise mt-4" aria-label="Your plan for today">
        <p className="eyebrow">Your plan</p>
        <div className="mt-2">
          <h2 className="font-display text-[length:var(--text-section)] text-foreground">
            Building your plan
          </h2>
          <ul className="nut-compose-steps" role="status" aria-label="Building your plan">
            {COMPOSE_STEPS.map((label, i) => (
              <li
                key={label}
                className="nut-compose-step"
                data-state={i < composeStep ? "done" : i === composeStep ? "active" : "pending"}
              >
                {i < composeStep ? (
                  <Check className="nut-compose-check size-4" aria-hidden />
                ) : (
                  <span className="nut-compose-dot" aria-hidden />
                )}
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <p className="nut-note">
            Built from your record and the dish library — no AI, no invented numbers.
          </p>
        </div>
      </section>
    );
  }

  if (state.kind === "refused") {
    const refusal = state.refusal;
    return (
      <section className="nut-card nut-rise mt-4" aria-label="Your plan for today">
        <p className="eyebrow">Your plan</p>
        {refusal.kind === "safety_blocked" ? (
          <div className="mt-2">
            <h2 className="font-display text-[length:var(--text-section)] text-foreground">
              Bloom won't build a plan from these answers
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
                The right next step is a conversation with a qualified professional — your doctor or
                a registered dietitian — who can set targets with your full picture in view.
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
            splits them across your meals, and builds each meal around a real dish from the dish
            library, its numbers computed from its ingredients and labelled with their source.
          </p>
          <GoalChips currentGoal={chipGoal} onSelect={setGoal} />
          <div className="mt-4">
            <Button type="button" onClick={() => compose()}>
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
            It aimed at {fmtKcalApprox(plan.targets.kcal)} and{" "}
            {fmtGrams(plan.targets.proteinG)} g of protein for{" "}
            {GOAL_LABEL[plan.goal].toLowerCase()}. Plans are built for a single day — create today's
            to follow it now.
          </p>
          <div className="mt-4">
            <Button type="button" onClick={() => compose()}>
              Create today's plan
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const { plan, staleness } = state;

  /* P7: what the log has taught, and the expenditure proposal. The
     learning is recomputed from the same log the composer read, so
     the surface explains the plan above it — and the proposal is a
     proposal: it renders numbers and two buttons, and only the
     Confirm button writes anything (the confirmed delta, through
     targetAdjustment's strict path). */
  const learning = planLearningFor(nutrition.entries, plan.day, plan.targets, {
    storedPlan: plan,
    sex: profile.sex === "unspecified" ? null : profile.sex,
  });
  const expenditure = estimateExpenditure(nutrition.entries, body.weighIns, plan.day);
  const estimate = expenditure.kind === "ready" ? expenditure.estimate : null;
  const activeDelta = targetAdjustment?.kcalDelta ?? 0;
  const engineTargetKcal = plan.targets.kcal - activeDelta;
  const proposalDelta =
    estimate && engineTdeeKcal !== null ? estimate.maintenanceKcal - engineTdeeKcal : null;
  const proposalKey =
    estimate && proposalDelta !== null
      ? `${estimate.fromDate}:${estimate.toDate}:${estimate.maintenanceKcal}:${engineTdeeKcal}`
      : null;
  const proposedTargetKcal = proposalDelta !== null ? engineTargetKcal + proposalDelta : null;
  const proposalApplicable =
    proposalDelta !== null &&
    Math.abs(proposalDelta) <= MAX_TARGET_ADJUSTMENT_KCAL &&
    adjustedTargets({ kcal: engineTargetKcal, proteinG: plan.targets.proteinG }, proposalDelta) !==
      null;
  const showProposal =
    estimate !== null &&
    proposalDelta !== null &&
    Math.abs(proposalDelta) >= 25 &&
    targetAdjustment?.kcalDelta !== proposalDelta &&
    dismissedProposal !== proposalKey;
  const confirmProposal = () => {
    if (!estimate || proposalDelta === null || engineTdeeKcal === null) return;
    confirmTargetAdjustment({
      kcalDelta: proposalDelta,
      confirmedAt: new Date().toISOString(),
      basedOn: {
        maintenanceKcal: estimate.maintenanceKcal,
        engineTdeeKcal,
        loggedDays: estimate.loggedDays,
        spanDays: estimate.spanDays,
        weightChangeKg: estimate.weightChangeKg,
      },
    });
  };
  const shortDay = (dayKey: string) =>
    new Date(`${dayKey}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  const weightPhrase =
    estimate === null || estimate.weightChangeKg === 0
      ? "held steady"
      : estimate.weightChangeKg > 0
        ? `rose by ${estimate.weightChangeKg} kg`
        : `fell by ${Math.abs(estimate.weightChangeKg)} kg`;

  /* The day's dish ideas, picked in meal order with each pick excluded
     from the next (P3): lunch and dinner draw on the same dish
     category and the same day rotation, so independent per-card picks
     served the same dish twice in one day. P5: an idea is offered
     only on a meal the dish composer could not fill (a dish-composed
     meal IS its dishes — an "idea" beside them would double-offer),
     and the day's plan dishes are excluded up front so an idea never
     repeats a dish the plan already serves. */
  const dishIdeas = new Map<PlanMeal["meal"], Dish>();
  {
    const usedDishIds = new Set<string>(plan.meals.flatMap((m) => m.dishes.map((d) => d.dishId)));
    for (const meal of plan.meals) {
      if (meal.meal === "snack") continue;
      if (meal.dishes.length > 0) continue;
      const idea = dishIdeaFor(profile, plan.day, meal.meal, undefined, usedDishIds);
      if (idea) {
        dishIdeas.set(meal.meal, idea);
        usedDishIds.add(idea.id);
      }
    }
  }

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
            {fmtGrams(suggestion.grams)} g · {Math.round(suggestion.nutrients.kcal)} kcal ·{" "}
            {fmtGrams(suggestion.nutrients.proteinG)} g protein
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

  /* One plan dish (P5): a row with the dish's photo and its computed
     numbers; tapping it unfolds the dish's ingredients — the raw
     things, per serving, exactly as the dish detail sheet lists them
     — with the dish's own log button and the full recipe one tap
     further. A dish the library no longer holds renders nothing (the
     plan's stored numbers still stand in the header sums). */
  const dishRow = (meal: PlanMeal, planDish: PlanDish) => {
    const dish = findDish(planDish.dishId);
    if (!dish) return null;
    const key = `${meal.meal}:${planDish.dishId}`;
    const expanded = expandedDish === key;
    const logged = planDishLogged(meal, planDish);
    return (
      <li key={planDish.dishId}>
        <button
          type="button"
          className="nut-dish-row"
          aria-expanded={expanded}
          aria-label={`${planDish.name} — show ingredients`}
          onClick={() => setExpandedDish(expanded ? null : key)}
        >
          <DishPhoto dishId={planDish.dishId} name={planDish.name} />
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[length:var(--text-callout)] font-medium text-foreground">
              {planDish.name} <span className="nut-hindi">({planDish.hindi})</span>
            </span>
            <span className="mt-0.5 block text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
              {Math.round(planDish.nutrients.kcal)} kcal ·{" "}
              {fmtGrams(planDish.nutrients.proteinG)} g protein per serving
            </span>
          </span>
          {planDish.role !== "anchor" ? (
            <span className="nut-chip shrink-0">{DISH_ROLE_LABEL[planDish.role]}</span>
          ) : null}
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {expanded ? (
          <div className="nut-dish-ingredients">
            <p className="nut-group-label">Ingredients · per serving</p>
            <ul className="mt-1 divide-y divide-border-subtle">
              {dish.lines.map((line) => {
                const food = findUsdaReference(line.foodId);
                const names = food
                  ? foodDisplayName(food)
                  : { en: line.foodId, hindi: null as string | null };
                return (
                  <li
                    key={line.foodId}
                    className="flex items-baseline justify-between gap-3 py-1.5"
                  >
                    <span className="min-w-0 text-[length:var(--text-callout)] text-foreground">
                      {names.en}
                      {names.hindi ? <span className="nut-hindi"> ({names.hindi})</span> : null}
                    </span>
                    <span className="shrink-0 text-[length:var(--text-callout)] tabular-nums text-muted-foreground">
                      {formatGrams((line.grams / dish.servings) * planDish.servings)} g
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <ProvenanceBadge kind="recipe" label={provenanceLabel(planDish.provenance)} />
              <span className="text-[length:var(--text-caption)] text-muted-foreground">
                Computed from these ingredients' USDA data.
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {logged ? (
                <span className="nut-chip" data-selected>
                  <Check className="size-3.5" aria-hidden /> Logged
                </span>
              ) : (
                <button
                  type="button"
                  className="nut-btn nut-btn-gold nut-btn-sm"
                  onClick={() => logPlanDish(meal, planDish)}
                >
                  Log this dish
                </button>
              )}
              <button
                type="button"
                className="nut-btn nut-btn-ghost nut-btn-sm"
                onClick={() => setSelectedDish({ dish, meal })}
              >
                Full recipe
              </button>
            </div>
          </div>
        ) : null}
      </li>
    );
  };

  const mealCard = (meal: PlanMeal) => {
    const dishComposed = meal.dishes.length > 0;
    const anchor = meal.dishes.find((d) => d.role === "anchor");
    const title = dishComposed ? (anchor?.name ?? meal.dishes[0]?.name) : dishTitleFor(meal);
    const sums = sumNutrients([
      ...meal.suggestions.map((s) => s.nutrients),
      ...meal.dishes.map((d) => d.nutrients),
    ]);
    const allLogged =
      (meal.suggestions.length > 0 || meal.dishes.length > 0) &&
      meal.suggestions.every((s) => suggestionLogged(meal, s)) &&
      meal.dishes.every((d) => planDishLogged(meal, d));
    const layered = !dishComposed && meal.meal !== "snack" && meal.suggestions.some((s) => s.layer);
    const topups = meal.suggestions.filter((s) => s.layer === "topup");
    const foodSuggestions = dishComposed
      ? meal.suggestions.filter((s) => s.layer !== "topup")
      : meal.suggestions;
    const empty = meal.dishes.length === 0 && meal.suggestions.length === 0;
    return (
      <article key={meal.meal} className="nut-card" aria-label={`${MEAL_LABEL[meal.meal]} plan`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{MEAL_LABEL[meal.meal]}</p>
            {title ? (
              <h3
                className="mt-1.5 truncate font-display text-[length:var(--text-title)] leading-tight text-foreground"
                title={title}
              >
                {title}
              </h3>
            ) : null}
          </div>
          {/* The header shows what the listed dishes and foods actually
              add up to (P3) — the meal's target share lives in the
              section header's day guide, not dressed up as this card's
              total. */}
          <p className="shrink-0 text-right">
            <span className="font-display text-[20px] text-foreground tabular-nums">
              {Math.round(sums.kcal)}
            </span>{" "}
            <span className="text-[length:var(--text-caption)] text-muted-foreground">kcal</span>
          </p>
        </div>

        {empty ? (
          <p className="nut-note">{meal.note}</p>
        ) : (
          <>
            {dishComposed ? (
              <ul className="mt-2 divide-y divide-border-subtle">
                {meal.dishes.map((d) => dishRow(meal, d))}
              </ul>
            ) : null}
            {dishComposed ? (
              <>
                {foodSuggestions.length > 0 ? (
                  <ul className="mt-2 divide-y divide-border-subtle">
                    {foodSuggestions.map((s) => suggestionRow(meal, s))}
                  </ul>
                ) : null}
                {topups.length > 0 ? (
                  <div className="mt-3">
                    <p className="nut-group-label">To complete the day</p>
                    <ul className="divide-y divide-border-subtle">
                      {topups.map((s) => suggestionRow(meal, s))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : layered ? (
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
                  {fmtGrams(sums.proteinG)} g
                </span>{" "}
                protein
                {sums.fibreG !== undefined ? <> · {fmtGrams(sums.fibreG)} g fibre</> : null}
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
    const idea = dishIdeas.get(meal.meal) ?? null;
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
              {Math.round(nutrients.kcal)} kcal · {fmtGrams(nutrients.proteinG)} g protein per
              serving
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

  const logDishIdea = (meal: PlanMeal, dish: Dish): boolean => {
    const entry = logDish(dish, meal.meal, plan.day);
    if (!entry) {
      setLogError(
        `“${dish.name.en}” couldn't be logged — its values fall outside the range the log can store.`,
      );
      return false;
    }
    setLogError(null);
    return true;
  };

  /* A plan dish logs through the same dish path as a dish idea — one
     serving of the library dish, a recipe-provenance snapshot of its
     computed totals, filed into the plan's meal on the plan's day. */
  const logPlanDish = (meal: PlanMeal, planDish: PlanDish) => {
    const dish = findDish(planDish.dishId);
    if (!dish) {
      setLogError(`“${planDish.name}” isn't in the dish library any more, so it can't be logged.`);
      return;
    }
    logDishIdea(meal, dish);
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
              {fmtGrams(plan.targets.proteinG)} g protein
            </span>{" "}
            across the day — your guide is {fmtKcalApprox(plan.targets.kcal)} and ~
            {fmtGrams(plan.targets.proteinG)} g.
          </p>
        </div>
        <button
          type="button"
          className="nut-btn nut-btn-ghost nut-btn-sm"
          onClick={() => compose()}
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
              {joinNames(staleness.changed.filter((c) => c !== "the plan method improved"))} changed
              — the plan below still uses the older numbers. Regenerate to bring it up to date.
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="nut-note">
        Targets are estimates from your body numbers (Mifflin–St Jeor) — a guide for the day, not a
        prescription.
        {plan.targetsSource === "body_profile"
          ? " This plan is built from your Trackers body numbers — the same targets that page shows."
          : ""}
      </p>

      {plan.morning ? (
        <div className="mt-5">
          <p className="nut-group-label">Start of day</p>
          <p className="nut-note">
            On waking: a glass of water ({plan.morning.waterMl} ml), before anything else.
            {plan.hydration ? (
              <>
                {" "}
                Water through the day: {plan.hydration.targetMl.toLocaleString("en-IN")} ml in
                all — {plan.hydration.wakeMl} ml on waking, then with your meals (
                {plan.hydration.perMeal
                  .map((p) => `${MEAL_LABEL[p.meal]} ${p.ml} ml`)
                  .join(" · ")}
                ).
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {plan.timeline ? (
        <div className="mt-5">
          <p className="nut-group-label">Your day</p>
          <ul className="nut-timeline">
            {plan.timeline.items.map((item, i) => (
              <li
                key={`${item.kind}-${item.meal ?? "x"}-${i}`}
                className="nut-timeline-item"
              >
                <span className="nut-timeline-time">
                  {item.time
                    ? formatClock(
                        Number(item.time.slice(0, 2)) * 60 + Number(item.time.slice(3, 5)),
                      )
                    : "—"}
                </span>
                <span>
                  {item.label}
                  {item.kind === "wake" && plan.morning
                    ? ` — a glass of water (${plan.morning.waterMl} ml)`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="nut-note">
            {plan.timeline.anchor === "sleep_log"
              ? "Times follow your usual wake and bed times, from your sleep log."
              : "In the day's order — once your sleep log holds a few nights, the plan can put your usual times to it."}
          </p>
        </div>
      ) : null}

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

      {showProposal && estimate && proposalDelta !== null && engineTdeeKcal !== null ? (
        <div className="nut-proposal" role="status">
          <p className="nut-group-label">Your real maintenance, from your record</p>
          <p className="mt-2 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
            Over {estimate.spanDays} days ({shortDay(estimate.fromDate)} –{" "}
            {shortDay(estimate.toDate)}) you logged {estimate.loggedDays} days averaging{" "}
            {Math.round(estimate.avgIntakeKcal).toLocaleString("en-US")} kcal, and your weight{" "}
            {weightPhrase}. That puts your maintenance near{" "}
            <span className="font-semibold">
              {estimate.maintenanceKcal.toLocaleString("en-US")} kcal
            </span>{" "}
            a day — {Math.abs(proposalDelta).toLocaleString("en-US")} kcal{" "}
            {proposalDelta > 0 ? "above" : "below"} the {engineTdeeKcal.toLocaleString("en-US")}{" "}
            kcal formula estimate behind your plan.
          </p>
          {proposalApplicable && proposedTargetKcal !== null ? (
            <p className="mt-2 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
              Confirming shifts your daily target by {proposalDelta > 0 ? "+" : "−"}
              {Math.abs(proposalDelta).toLocaleString("en-US")} kcal, to{" "}
              {proposedTargetKcal.toLocaleString("en-US")} kcal — your goal pace stays the same, and
              the plan above keeps its current numbers until you compose again.
            </p>
          ) : (
            <p className="mt-2 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
              That gap is too large to apply with one tap. It is worth checking your body numbers in
              Trackers first — if they are right, a fresh plan can be built from them.
            </p>
          )}
          <p className="nut-note">
            An estimate from your logged days and weigh-ins, with weight change counted at 7,700
            kcal per kg — not a measurement. Nothing changes unless you confirm.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {proposalApplicable ? (
              <button
                type="button"
                className="nut-btn nut-btn-gold nut-btn-sm"
                onClick={confirmProposal}
              >
                Confirm new target
              </button>
            ) : null}
            <button
              type="button"
              className="nut-btn nut-btn-ghost nut-btn-sm"
              onClick={() => setDismissedProposal(proposalKey)}
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}

      {learning ||
      targetAdjustment ||
      (expenditure.kind === "insufficient" &&
        (expenditure.loggedDays > 0 || expenditure.weightPoints > 0)) ||
      (estimate && !showProposal && proposalDelta !== null && Math.abs(proposalDelta) < 25) ? (
        <div className="mt-5">
          <p className="nut-group-label">What your plan learned</p>
          {learning?.adherence ? (
            <p className="nut-note">
              Over your last {learning.adherence.days} logged days you averaged{" "}
              {Math.round(learning.adherence.avgKcal).toLocaleString("en-US")} kcal and{" "}
              {Math.round(learning.adherence.avgProteinG)} g protein a day, against targets of{" "}
              {Math.round(plan.targets.kcal).toLocaleString("en-US")} kcal and{" "}
              {fmtGrams(plan.targets.proteinG)} g.
            </p>
          ) : null}
          {learning && learning.favouredDishes.length > 0 ? (
            <p className="nut-note">
              Dishes you return to:{" "}
              {learning.favouredDishes
                .slice(0, 5)
                .map((d) => `${d.name} (logged ${d.count} times)`)
                .join(", ")}
              {learning.favouredDishes.length > 5
                ? `, and ${learning.favouredDishes.length - 5} more`
                : ""}
              . They lead the picks.
            </p>
          ) : null}
          {learning && learning.deprioritisedDishes.length > 0 ? (
            <p className="nut-note">
              Served by an earlier plan but never logged:{" "}
              {learning.deprioritisedDishes
                .slice(0, 5)
                .map((d) => d.name)
                .join(", ")}
              . They sit further back.
            </p>
          ) : null}
          {learning?.microGaps.map((gap) => (
            <p key={gap.key} className="nut-note">
              {gap.label} averaged{" "}
              {gap.unit === "g" ? Math.round(gap.avg * 10) / 10 : Math.round(gap.avg)} {gap.unit} a
              day over {gap.days} logged days, against the {gap.reference} {gap.unit} reference —
              dishes richer in {gap.label.toLowerCase()} are favoured.
            </p>
          ))}
          {learning?.portionSignals.map((signal) => (
            <p key={signal.foodId} className="nut-note">
              You usually log {signal.typicalGrams} g of {signal.name}; the plan serves{" "}
              {signal.plannedGrams} g (from {signal.logs} logs). Portions stay as planned — the
              choice is yours.
            </p>
          ))}
          {estimate && !showProposal && proposalDelta !== null && Math.abs(proposalDelta) < 25 ? (
            <p className="nut-note">
              Your record puts your maintenance near{" "}
              {estimate.maintenanceKcal.toLocaleString("en-US")} kcal — in line with your current
              target, so no change is proposed.
            </p>
          ) : null}
          {expenditure.kind === "insufficient" &&
          (expenditure.loggedDays > 0 || expenditure.weightPoints > 0) ? (
            <p className="nut-note">
              Maintenance estimate: still gathering — {expenditure.loggedDays} of 10 logged days and{" "}
              {expenditure.weightPoints} {expenditure.weightPoints === 1 ? "weigh-in" : "weigh-ins"}{" "}
              on record. It needs 2 weigh-ins spanning at least 10 days, with 10 logged days between
              them.
            </p>
          ) : null}
          {targetAdjustment ? (
            <p className="nut-note">
              Your energy target includes your confirmed{" "}
              {targetAdjustment.kcalDelta > 0 ? "+" : "−"}
              {Math.abs(targetAdjustment.kcalDelta).toLocaleString("en-US")} kcal adjustment —
              maintenance estimated at{" "}
              {targetAdjustment.basedOn.maintenanceKcal.toLocaleString("en-US")} kcal from{" "}
              {targetAdjustment.basedOn.loggedDays} logged days over a{" "}
              {targetAdjustment.basedOn.spanDays}-day window.{" "}
              <button
                type="button"
                className="nut-inline-link"
                onClick={() => clearTargetAdjustment()}
              >
                Remove adjustment
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {logError ? (
        <p className="nut-error mt-3" role="alert">
          {logError}
        </p>
      ) : null}

      <p className="nut-note">
        Plans are built from real dishes in Bloom's library — each dish's numbers are computed from
        its ingredients' USDA data — topped up with simple foods only where the dishes leave the day
        short. They are a starting point — log what you actually eat and your totals follow that.
      </p>

      {selectedDish ? (
        <DishDetailSheet
          dish={selectedDish.dish}
          day={plan.day}
          onClose={() => setSelectedDish(null)}
          onLog={(dish) => logDishIdea(selectedDish.meal, dish)}
        />
      ) : null}
    </section>
  );
}
