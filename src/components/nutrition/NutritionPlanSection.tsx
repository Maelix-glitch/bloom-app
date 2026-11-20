/**
 * NutritionPlanSection — today's goal-based plan (P1/P2), restyled as
 * the prototype's PlanPanel (N-UI): the goal as a segmented control
 * (brief v7 N2), "Suggest different meals", the meals as rows in one
 * panel (brief v7 N3), each titled by a dish title derived
 * mechanically from the meal's own base + protein items (only what
 * is in the plan — the Coach dish-name rule), items in layer order,
 * and a "Log meal" action that bulk-logs duplicate-safely through
 * the plan-log record.
 *
 * Every refusal and safety state is Bloom's, unchanged: a safety block
 * shows the classifier's own words and points at a professional;
 * missing inputs are listed, not papered over. The goal control writes
 * through the same goal source the engine reads (see usePlan.setGoal)
 * and never regenerates silently — the plan goes stale by name until
 * the explicit Suggest different meals tap.
 *
 * Brief v7 N5 (the shell): the plan renders as the day reads —
 * a header card (eyebrow, "Today's plan", the stat strip, the goal
 * control), the WaterBloom panel standing in the flow as the day's
 * companion, a day card holding the DayPath and the meal rows, then
 * Today's balance and How today's plan was adjusted (§7.1).
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
 * further in the dish detail sheet. Simple foods — top-ups included —
 * flow in the same list as the meal's other items (M-166), so the
 * rows a reader sees always sum to the meal's stated total. A meal
 * the dish pool could not fill keeps the layered food rendering
 * above, and its D4 dish idea with it.
 *
 * P8: composing runs behind a designed loading state, scoped to
 * this section (never a full-screen takeover): the three honest
 * steps of the work — reading the record, choosing the dishes,
 * balancing the day — shown in order while generation runs, with a
 * short minimum display so the plan's reveal is a reveal, not a
 * flicker. The steps name what the engine actually does; nothing
 * is claimed to happen that does not.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Beef,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  Cookie,
  Flame,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAssessment } from "@/hooks/useAssessment";
import { peekEntitlement } from "@/lib/billing/entitlement";
import { requestPaywall } from "@/lib/billing/paywall";
import { canUse } from "@/lib/billing/plans";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useNutrition } from "@/hooks/useNutrition";
import { usePlan } from "@/hooks/usePlan";
import { useTrackers } from "@/hooks/useTrackers";
import { useSession } from "@/hooks/useSession";
import { GOAL_LABEL } from "@/lib/assessment/questions";
import { fmtGrams, fmtInt, fmtKcalApprox } from "@/lib/format";
import { adjustmentCopy, reasonDetail, type AdjustmentCopy } from "@/lib/reasons";
import { useInView } from "@/components/ci/motion";
import { toHealthProfile } from "@/lib/assessment/state";
import { SAFETY_DISCLAIMER } from "@/lib/vitalis/domain/safety";
import {
  buildPlanView,
  DISH_LIBRARY,
  MAX_TARGET_ADJUSTMENT_KCAL,
  USDA_REFERENCE_FOODS,
  adjustedTargets,
  confirmTargetAdjustment,
  dishIdeaFor,
  dishNutrients,
  dishPhotoFor,
  displayDishName,
  displayNameForFoodId,
  estimateExpenditure,
  findDish,
  findUsdaReference,
  foodDisplayName,
  goalProfileOf,
  logDish,
  provenanceLabel,
  type Dish,
  type Meal,
  type PlanDish,
  type PlanMeal,
  type PlanSuggestion,
  type SuggestionLayer,
} from "@/lib/nutrition";
import type { PlanRailStop, PlanViewMeal, PlanViewMeter } from "@/lib/nutrition/planView";
import { rawBasisFraming } from "@/lib/nutrition/preparation";
import { BloomFlower } from "./BloomFlower";
import {
  CookingBadge,
  DayPath,
  MoreDisclosure,
  SegmentedGoalControl,
  SegmentedSnackControl,
  StatStrip,
  type KitchenAnswers,
} from "./PlanPrimitives";
import { DishDetailSheet } from "./DishDetailSheet";
import { DayCaretakerSection } from "./DayCaretakerSection";
import { WaterBloomPanel } from "./WaterBloom";
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

/** The Bloom petal (BloomFlower's crafted path, in its 120 box) —
 *  the tile a meal's photograph falls back to when the reviewed
 *  photograph itself fails to load (brief v7 N3, M-150). */
const PETAL_PATH = "M60 60C48 46 46 27 60 6C74 27 72 46 60 60Z";

/**
 * A meal row's photograph: the anchor dish's reviewed photograph
 * (the dishImages manifest — the only set rows may draw from,
 * M-150), as a bare image beside the row's title. No reviewed
 * photograph → nothing, exactly as DishPhoto answers. A photograph
 * that fails to load falls back to the petal tile rather than a
 * broken-image box.
 */
function MealThumb({ dishId }: { dishId: string }) {
  const photo = dishPhotoFor(dishId);
  const [failed, setFailed] = useState(false);
  if (!photo) return null;
  if (failed) {
    return (
      <span className="meal-row__petal" aria-hidden="true">
        <svg viewBox="0 0 120 120">
          <path d={PETAL_PATH} className="petal is-on" />
        </svg>
      </span>
    );
  }
  return (
    <img
      className="meal-row__thumb"
      src={photo.src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
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

/**
 * One balance meter (brief v7 N4): a guideline group's day in two
 * layers over ONE track — the eaten grams SOLID (measured: the
 * log), the day's reach HATCHED (planned: eaten + what the plan's
 * meals carry), and the ICMR-NIN guideline as the tick at the
 * track's end (rule 4: solid = measured, hatched = planned). The
 * numbers come from planView's meter verbatim — eaten, planned,
 * reach, target, each stated once — and the progressbar's value is
 * the reach, the bar's full extent. Both layers grow once when
 * scrolled into view (scaleX transforms, never a width; stilled
 * under reduced motion). This replaces the v4 GoalMeter, whose
 * single fill showed the plan's grams alone and whose hint line
 * ("… g to go · ICMR-NIN guideline") was a paragraph wearing a
 * banned word — the legend under the meters carries the key now.
 */
function BalanceMeter({ meter }: { meter: PlanViewMeter }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const share = (g: number) => (meter.target > 0 ? Math.min(1, g / meter.target) : 0);
  const metric =
    meter.key === "vegetables" ? "guideline-veg-grams" : "guideline-fruit-grams";
  return (
    <div className="bal-meter">
      <div className="bal-meter__row">
        <span>{meter.label}</span>
        <b data-metric={metric}>
          {fmtGrams(meter.reach)} <small>/ {fmtGrams(meter.target)} g</small>
        </b>
      </div>
      <div
        ref={ref}
        className="bal-meter__track"
        role="progressbar"
        aria-label={`${meter.label}: ${Math.round(meter.reach)} of ${meter.target} grams`}
        aria-valuenow={Math.round(meter.reach)}
        aria-valuemin={0}
        aria-valuemax={meter.target}
      >
        <span
          className="bal-meter__layer is-reach"
          style={{ transform: `scaleX(${inView ? share(meter.reach) : 0})` }}
        />
        <span
          className="bal-meter__layer is-eaten"
          style={{ transform: `scaleX(${inView ? share(meter.eaten) : 0})` }}
        />
      </div>
      <div className="bal-meter__sub">
        <span>{fmtGrams(meter.eaten)} g logged</span>
        <span>{fmtGrams(meter.planned)} g in the plan</span>
      </div>
    </div>
  );
}

/* The adjusted section's priority (brief 3.3) — gates, then
   adaptation, then the day's structure — and the one definition of
   what an adjustment is live in planView.ts (`ADJUSTMENT_TIER`,
   `adjustmentsOf`): brief v7 N1 made the adjustments array the
   single source, and N4 made its rendering read from that array
   alone (M-138). */

/** The row icons, keyed by the icon NAMES `adjustmentCopy` returns
 *  (reasons.ts owns the words and the choice; this map owns the
 *  glyphs). */
const ADJ_ICON: Record<string, ReactNode> = {
  trend: <Beef />,
  pan: <ChefHat />,
  plus: <Cookie />,
  wallet: <Wallet />,
  clock: <Clock />,
  flame: <Flame />,
};

/**
 * One adjustment row (brief v7 N4): an .insight whose words are
 * `adjustmentCopy`'s alone — icon, title, the ≤140-char detail
 * whole (no clamp, no More: at row length the sentence fits), the
 * dashed badge when the copy carries one (an early read is an
 * estimate, and dashed says so — rule 4), and the copy's action
 * when it carries one. Before N4 the rows were worded by
 * `reasonCopy` with a source chip and a clamp; the array was
 * already the single source (N1) — now the words are too.
 */
function AdjustmentRow({ copy }: { copy: AdjustmentCopy }) {
  const actionTo = copy.action ? copy.action.href.split("#")[0] : undefined;
  const actionHash = copy.action ? copy.action.href.split("#")[1] : undefined;
  return (
    <article className="insight">
      <span className="insight__icon" aria-hidden="true">
        {ADJ_ICON[copy.icon] ?? <SlidersHorizontal />}
      </span>
      <div className="min-w-0">
        <h3>{copy.title}</h3>
        <p>{copy.detail}</p>
        {copy.action && actionTo ? (
          <Link
            to={actionTo}
            {...(actionHash ? { hash: actionHash } : {})}
            className="nut-inline-link adj-action"
          >
            {copy.action.label}
          </Link>
        ) : null}
      </div>
      {copy.badge ? (
        <span className="nut-badge src-chip" data-estimate="true">
          {copy.badge}
        </span>
      ) : null}
    </article>
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
    snackPlacement,
    setSnackPlacement,
  } = usePlan();
  const assessment = useAssessment();
  const session = useSession();
  /* The tracker store rides along for one figure: the resolved water
     target (M-165). The water panel below must stand even on a day no
     plan has been made for, and this is the same resolved figure
     Trackers measures against — never a second computation. */
  const trackerStore = useTrackers();

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
  /* The balance tally's lookup maps — the same food universe the
     composer planned over (the person's foods + the USDA reference
     set) and the shipped dish library, so the flower counts the
     plan's real ingredients, exactly as floorTotalsOf counts them. */
  const foodById = useMemo(
    () =>
      new Map(
        [...nutrition.foods, ...USDA_REFERENCE_FOODS].map((f) => [f.id, f] as const),
      ),
    [nutrition.foods],
  );
  const dishById = useMemo(() => new Map(DISH_LIBRARY.map((d) => [d.id, d] as const)), []);
  const [logError, setLogError] = useState<string | null>(null);
  /* P7: the dismissed expenditure proposal's fingerprint — dismissing
     stores nothing; the card simply stays away while the estimate
     behind it is unchanged. */
  const [dismissedProposal, setDismissedProposal] = useState<string | null>(null);
  /* P5: which plan dish's ingredients are unfolded, and which dish's
     full recipe sheet is open (with the plan meal it belongs to, so
     the sheet's Log button files it into the plan's meal). */
  const [expandedDish, setExpandedDish] = useState<string | null>(null);
  /* Brief v7 N3: which meal row is expanded. Until the person taps
     a row (`openTouched`), the expanded row is the clock's primary
     meal — the day opens where the day has arrived. */
  const [openMeal, setOpenMeal] = useState<Meal | null>(null);
  const [openTouched, setOpenTouched] = useState(false);
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
      <section className="nut-card nut-rise section" aria-label="Your plan for today">
        <div className="section-head">
          <div className="section-head__main">
            <div className="eyebrow">Your plan</div>
            <h2 className="section-head__title mt-1.5">Building your plan</h2>
          </div>
        </div>
        <div className="mt-2">
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
      <section className="nut-card nut-rise section" aria-label="Your plan for today">
        {refusal.kind === "safety_blocked" ? (
          <div className="mt-2">
            <div className="section-head">
              <div className="section-head__main">
                <div className="eyebrow">Your plan</div>
                <h2 className="section-head__title mt-1.5">
                  Bloom won't build a plan from these answers
                </h2>
              </div>
            </div>
            {refusal.findings.map((finding) => (
              <p
                key={finding.ruleId}
                className="mt-2 text-[length:var(--text-body)] leading-[var(--leading-body)] text-muted-foreground"
              >
                {finding.summary}
              </p>
            ))}
            {refusal.requiresProfessionalReview ? (
              <p className="mt-2 text-[length:var(--text-body)] leading-[var(--leading-body)] text-foreground">
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
            <div className="section-head">
              <div className="section-head__main">
                <div className="eyebrow">Your plan</div>
                <h2 className="section-head__title mt-1.5">
                  Not enough to build a plan Bloom can stand behind
                </h2>
              </div>
            </div>
            <p className="mt-2 text-[length:var(--text-body)] leading-[var(--leading-body)] text-muted-foreground">
              A plan is only worth following if every number in it is really yours. Bloom still
              needs:
            </p>
            <ul className="mt-2 list-disc pl-5 text-[length:var(--text-body)] leading-[var(--leading-body)] text-foreground">
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
      <section className="nut-card nut-rise section" aria-label="Your plan for today">
        <div className="mt-2">
          <div className="section-head">
            <div className="section-head__main">
              <div className="eyebrow">Your plan</div>
              <h2 className="section-head__title mt-1.5">
                A plan for your goal, built from your numbers
              </h2>
            </div>
          </div>
          <p className="mt-2 max-w-[56ch] text-[length:var(--text-body)] leading-[var(--leading-body)] text-muted-foreground">
            Bloom computes your daily targets deterministically — no AI, no invented numbers —
            splits them across your meals, and builds each meal around a real dish from the dish
            library, its numbers computed from its ingredients and labelled with their source.
          </p>
          <SegmentedGoalControl current={chipGoal} onSelect={setGoal} />
          <div className="mt-4">
            <Button type="button" onClick={() => compose()}>
              Create my plan
            </Button>
          </div>
          {/* M-165: the water panel stands even before any plan exists.
              Its target is the resolved tracker figure — the same
              planWaterTargetMlOf resolution Trackers uses — and the
              panel reads today's water live from the tracker store,
              so nothing here can disagree with the Trackers page.
              No resolved figure → no panel; a target is never invented. */}
          {trackerStore.waterTargetMl != null ? (
            <WaterBloomPanel targetMl={trackerStore.waterTargetMl} />
          ) : null}
        </div>
      </section>
    );
  }

  if (state.kind === "outdated") {
    const plan = state.plan;
    return (
      <section className="nut-card nut-rise section" aria-label="Your plan for today">
        <div className="mt-2">
          <div className="section-head">
            <div className="section-head__main">
              <div className="eyebrow">Your plan</div>
              <h2 className="section-head__title mt-1.5">
                This plan was made for {formatPlanDay(plan.day)}
              </h2>
            </div>
          </div>
          <p className="mt-2 max-w-[56ch] text-[length:var(--text-body)] leading-[var(--leading-body)] text-muted-foreground">
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
          {/* M-165: yesterday's plan still carries its hydration
              target, and the panel reads TODAY's water live from the
              tracker store — so the Bloom stays reachable and truthful
              on the days between plans, wearing the stored plan's own
              figure, exactly as the ready state wears today's. */}
          {plan.hydration ? <WaterBloomPanel targetMl={plan.hydration.targetMl} /> : null}
        </div>
      </section>
    );
  }

  const { plan, staleness } = state;

  /* P7: the expenditure proposal. It is a proposal: it renders
     numbers and two buttons, and only the Confirm button writes
     anything (the confirmed delta, through targetAdjustment's
     strict path). (The learning the composer read is no longer
     rendered here — brief v4 Slice 5 moved its conclusions into
     the Metabolic Twin's insight strip.) */
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

  /* Brief v4 Slice 4 (M-88): a meal counts as logged when every
     dish and food on it is in the log — the test the card footer
     always used, hoisted so the day can name its meals' states. */
  const mealAllLogged = (meal: PlanMeal): boolean =>
    (meal.suggestions.length > 0 || meal.dishes.length > 0) &&
    meal.suggestions.every((s) => suggestionLogged(meal, s)) &&
    meal.dishes.every((d) => planDishLogged(meal, d));

  /* Brief v7: the plan view (N1) is the section's one source — the
     meal order, each meal's totals, the logged states, the CLOCK's
     primary meal (M-149: pickPrimaryMeal replaces the v4 rule
     "first unlogged in stored order", under which Breakfast held
     the gold button all evening), the day rail and the header
     figures all read from it. Built here, before the row renderers,
     so every number below comes from the view. */
  const view = buildPlanView({
    plan,
    log: {
      loggedMealIds: new Set(plan.meals.filter(mealAllLogged).map((m) => m.meal)),
      entries: nutrition.entries,
    },
    byFoodId: foodById,
    byDishId: dishById,
  });
  const showKcal = view.showKcal;
  /** A kcal figure under the view's calorie visibility (rule 8):
   *  the number, or the redaction the rows render in its place. */
  const kcalText = (kcal: number): string =>
    showKcal ? `${fmtInt(Math.round(kcal))} kcal` : "••• kcal";

  /* The kitchen answers the dishes' cooking badges are judged by
     (M-139, display only): the snapshot on the plan itself first —
     the answers this plan was composed against — and, for any field
     the snapshot lacks, the person's CURRENT Assessment answers. A
     stored plan composed before the snapshot carried the kitchen
     fields parses them as null; judging from the snapshot alone
     meant such a plan could never show a conflict, however cooked
     its dishes and however plainly the Assessment says "no cooking"
     (live, PR #210 sweep). The composer is untouched — this only
     decides what the badge compares against. */
  const kitchenAnswers: KitchenAnswers = {
    cookingAbility:
      plan.inputs.cookingAbility ?? assessment.state.answers.cookingAbility ?? null,
    prepTimeMaxMinutes:
      plan.inputs.prepTimeMaxMinutes ??
      assessment.state.answers.prepTimeMaxMinutes ??
      null,
  };

  /* The expanded meal row: the person's own tap once they make
     one; until then, the clock's primary meal. */
  const primaryMeal = view.meals.find((m) => m.primary)?.meal ?? null;
  const expandedMeal = openTouched ? openMeal : primaryMeal;
  const toggleMeal = (slot: Meal) => {
    setOpenTouched(true);
    setOpenMeal(expandedMeal === slot ? null : slot);
  };

  /* The day path's thumbnails: each meal stop wears its anchor
     dish's reviewed photograph, when the manifest holds one. */
  const thumbFor = (stop: PlanRailStop): string | null => {
    if (!stop.meal) return null;
    const vm = view.meals.find((m) => m.meal === stop.meal);
    const anchor = vm?.source.dishes.find((d) => d.role === "anchor") ?? vm?.source.dishes[0];
    return anchor ? (dishPhotoFor(anchor.dishId)?.src ?? null) : null;
  };

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
            {/* Brief v7 N6 (M-147, closing the remainder): a top-up is
                already inside the meal's one stated total (mealTotals
                sums it — N1 verified 276 + 37 = 313), and the row now
                SAYS so: a quiet badge, solid because the inclusion is
                a fact about the total, not an estimate. Without it the
                row read as an extra the total had not counted. */}
            {suggestion.layer === "topup" ? (
              <span className="nut-badge" data-included="true">
                Included in total
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
            {fmtGrams(suggestion.grams)} g · {kcalText(suggestion.nutrients.kcal)} ·{" "}
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
    /* Brief v7 N3 (M-148): the dish renders under its curated
       display name — the local name only when it is a real one. */
    const display = displayDishName(dish);
    return (
      <li key={planDish.dishId}>
        <button
          type="button"
          className="nut-dish-row"
          aria-expanded={expanded}
          aria-label={`${display.en} — show ingredients`}
          onClick={() => setExpandedDish(expanded ? null : key)}
        >
          <DishPhoto dishId={planDish.dishId} name={display.en} />
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[length:var(--text-callout)] font-medium text-foreground">
              {display.en}
              {display.hindi ? <span className="nut-hindi"> ({display.hindi})</span> : null}
            </span>
            <span className="mt-0.5 block text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
              {kcalText(planDish.nutrients.kcal)} ·{" "}
              {fmtGrams(planDish.nutrients.proteinG)} g protein per serving
            </span>
          </span>
          <CookingBadge dish={dish} answers={kitchenAnswers} />
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
                /* Method 13: a raw-basis line's grams are the dry
                   weight that goes into the pot — the framing says
                   so, so they are never read as a cooked portion. */
                const framing = food ? rawBasisFraming(food) : null;
                return (
                  <li
                    key={line.foodId}
                    className="flex items-baseline justify-between gap-3 py-1.5"
                  >
                    <span className="min-w-0 text-[length:var(--text-callout)] text-foreground">
                      {names.en}
                      {names.hindi ? <span className="nut-hindi"> ({names.hindi})</span> : null}
                      {framing ? (
                        <span className="block text-[length:var(--text-caption)] text-muted-foreground">
                          {framing}
                        </span>
                      ) : null}
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
                  className="nut-btn nut-btn-ghost nut-btn-sm"
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

  /* Brief v7 N3: a meal is a ROW in the one panel, hung on the day
     path — eyebrow (the meal and the rail's word/time for it), the
     serif title, ONE meta line (the meal's kcal once, its protein
     once, the anchor dish's cooking badge), and the fixed
     four-column macro table whose headers are the protected macro
     dots (brief v4 Part 3.1: colour lives in the dot alone, never
     in the numbers). Tapping the row expands it in place: its
     dishes and foods with their per-item log buttons, the top-ups
     grouped as what they are, the meal note, and the dish idea as
     a quiet link. The per-meal card this replaces stated the meal's
     name, kcal and protein three times over (M-141) and nested a
     card inside the section's card (M-146); here every number is
     stated once, from planView's totals — the composed sum of what
     the meal actually lists (P3), never its target share. The one
     gold "Log meal" rides the CLOCK's primary meal (M-149); a
     logged meal wears its badge instead. */
  const mealRow = (vm: PlanViewMeal) => {
    const meal = vm.source;
    const sums = vm.totals;
    const allLogged = vm.logged;
    const dishComposed = meal.dishes.length > 0;
    const anchorPd = meal.dishes.find((d) => d.role === "anchor") ?? meal.dishes[0];
    const anchorDish = anchorPd ? findDish(anchorPd.dishId) : null;
    const layered = !dishComposed && meal.meal !== "snack" && meal.suggestions.some((s) => s.layer);
    const topups = meal.suggestions.filter((s) => s.layer === "topup");
    const foodSuggestions = dishComposed
      ? meal.suggestions.filter((s) => s.layer !== "topup")
      : meal.suggestions;
    const empty = meal.dishes.length === 0 && meal.suggestions.length === 0;
    /* The meal note's words come from reasons.ts when the meal
       carries its structured reason (brief v4); plans stored before
       reasons existed fall back to the stored string. */
    const mealNoteText = meal.noteReason ? reasonDetail(meal.noteReason) : meal.note;
    const open = expandedMeal === meal.meal;
    const bodyId = `meal-body-${meal.meal}`;
    const stop = view.rail.find((s) => s.meal === meal.meal);
    /* The title: a dish-composed meal is titled by its anchor dish
       under its curated display name (M-148); a dish the library no
       longer holds falls back to the plan's stored name, with no
       local name claimed. A food-composed meal keeps the title
       derived from its own items. */
    const anchorDisplay = dishComposed
      ? anchorDish
        ? displayDishName(anchorDish)
        : { en: anchorPd?.name ?? "", hindi: null as string | null }
      : null;
    const title = dishComposed ? anchorDisplay!.en : dishTitleFor(meal);
    const titleHindi = dishComposed ? anchorDisplay!.hindi : null;
    const eyebrow = (
      <>
        {MEAL_LABEL[meal.meal]}
        {stop ? (
          <>
            {" · "}
            <span data-estimated={stop.whenEstimated || undefined}>{stop.whenText}</span>
          </>
        ) : null}
      </>
    );
    return (
      <article
        key={meal.meal}
        id={`meal-${meal.meal}`}
        className="meal-row"
        data-meal={meal.meal}
        data-logged={allLogged || undefined}
        aria-label={`${MEAL_LABEL[meal.meal]} plan`}
      >
        <div className="meal-row__head">
          {empty ? (
            <div className="meal-row__static">
              <span className="meal-row__eyebrow">{eyebrow}</span>
              {mealNoteText ? <p className="meal-row__note">{mealNoteText}</p> : null}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="meal-row__toggle"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() => toggleMeal(meal.meal)}
              >
                {anchorPd ? <MealThumb dishId={anchorPd.dishId} /> : null}
                <span className="meal-row__main">
                  <span className="meal-row__eyebrow">{eyebrow}</span>
                  {title ? (
                    <span className="meal-row__title">
                      {title}
                      {titleHindi ? (
                        <span className="nut-hindi-title"> ({titleHindi})</span>
                      ) : null}
                    </span>
                  ) : null}
                  <span className="meal-row__meta" data-meta>
                    {kcalText(sums.kcal)} · {fmtGrams(sums.proteinG)} g protein
                    {anchorDish ? (
                      <>
                        {" "}
                        <CookingBadge dish={anchorDish} answers={kitchenAnswers} />
                      </>
                    ) : null}
                  </span>
                </span>
                <ChevronDown
                  className={`meal-row__chev size-4${open ? " is-open" : ""}`}
                  aria-hidden
                />
              </button>
              <div className="meal-row__action">
                {allLogged ? (
                  <span className="nut-chip" data-selected>
                    <Check className="size-3.5" aria-hidden /> Logged
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`nut-btn nut-btn-sm ${
                      vm.primary ? "nut-btn-gold" : "nut-btn-ghost"
                    }`}
                    onClick={() => logWholeMeal(meal)}
                  >
                    Log meal
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {!empty ? (
          <table className="meal-macros">
            <thead>
              <tr>
                <th scope="col">
                  <i className="dot dot--protein" aria-hidden="true" />
                  Protein
                </th>
                <th scope="col">
                  <i className="dot dot--carb" aria-hidden="true" />
                  Carbs
                </th>
                <th scope="col">
                  <i className="dot dot--fat" aria-hidden="true" />
                  Fat
                </th>
                <th scope="col">
                  <i className="dot dot--fibre" aria-hidden="true" />
                  Fibre
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{fmtGrams(sums.proteinG)} g</td>
                <td>{fmtGrams(sums.carbsG)} g</td>
                <td>{fmtGrams(sums.fatG)} g</td>
                <td>
                  {sums.fibreG !== undefined ? `${fmtGrams(sums.fibreG)} g` : "Not reported"}
                </td>
              </tr>
            </tbody>
          </table>
        ) : null}

        {open && !empty ? (
          <div className="meal-row__body" id={bodyId}>
            {dishComposed ? (
              <ul className="divide-y divide-border-subtle">
                {meal.dishes.map((d) => dishRow(meal, d))}
              </ul>
            ) : null}
            {dishComposed ? (
              <>
                {/* M-166: the top-ups flow in the SAME list as the
                    meal's other foods — no separate group. The header
                    total sums them (mealTotals always did), so a
                    reader adding up the visible rows must be able to
                    reach it; exiled to their own group below, they
                    could not, and the header read as a lie. The row
                    itself still wears its "Included in total" badge —
                    the honesty now sits on the row, in the flow. */}
                {foodSuggestions.length > 0 || topups.length > 0 ? (
                  <ul className="divide-y divide-border-subtle">
                    {foodSuggestions.map((s) => suggestionRow(meal, s))}
                    {topups.map((s) => suggestionRow(meal, s))}
                  </ul>
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
              <ul className="divide-y divide-border-subtle">
                {meal.suggestions.map((s) => suggestionRow(meal, s))}
              </ul>
            )}
            {mealNoteText ? <p className="nut-note">{mealNoteText}</p> : null}
            {dishIdeaLink(meal)}
          </div>
        ) : null}
      </article>
    );
  };

  /* One dish idea per main meal (D4), demoted by brief v7 N3 to a
     quiet text link inside the row's expansion: a library dish that
     suits the person's pattern and passes the plan's own
     allergy/dislike gates, rotating by day. The layered ingredient
     suggestions above are the plan; this is a cookable alternative
     for the same slot, logged through the dish path (a
     recipe-provenance portion snapshot). No qualifying dish → no
     link — the row is never padded. */
  const dishIdeaLink = (meal: PlanMeal) => {
    if (meal.meal === "snack") return null;
    const idea = dishIdeas.get(meal.meal) ?? null;
    if (!idea) return null;
    const nutrients = dishNutrients(idea).nutrients;
    const display = displayDishName(idea);
    const logged = nutrition.entries.some(
      (e) =>
        e.day === plan.day &&
        e.meal === meal.meal &&
        e.source === "dish" &&
        e.provenance.kind === "recipe" &&
        e.provenance.sourceId === idea.id,
    );
    if (logged) {
      return (
        <p className="meal-idea-logged">
          Dish idea: {display.en} · <Check className="size-3.5" aria-hidden /> Logged
        </p>
      );
    }
    return (
      <button
        type="button"
        className="meal-idea-link"
        onClick={() => logDishIdea(meal, idea)}
      >
        Dish idea: {display.en}
        {display.hindi ? <span className="nut-hindi"> ({display.hindi})</span> : null}
        <span className="meal-idea-link__nums">
          {kcalText(nutrients.kcal)} · {fmtGrams(nutrients.proteinG)} g protein per serving
        </span>
      </button>
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

  /* Brief v7 N4: the balance and the adjusted list read the VIEW
     alone — the notes partition that v4 Slice 3 built (and Slice 4
     half-emptied) is deleted outright. The balance section renders
     no notes at all: the guideline judgements are the flower, the
     meters and the chips; the protein/energy judgements restated
     figures the header stat strip already states once; the
     learning notes' facts are the composed dishes themselves (and
     learning's home is the Twin); the per-meal notes still render
     in their meal rows, untouched. With no prose left to partition,
     the two sections cannot disagree (M-138, closed). The adjusted
     rows are the view's adjustments array worded by
     `adjustmentCopy` — the section derives nothing itself. */
  const adjustmentCopies = view.adjustments
    .map((a) => adjustmentCopy(a))
    .filter((c): c is AdjustmentCopy => c !== null);
  /* The flower's input: planView's ONE groups array projected onto
     the two facts the flower reads — a petal is filled when its
     group is eaten or planned (the count of non-open petals is the
     headline count, by construction). */
  const flowerGroups = view.balance.groups.map((g) => ({
    key: g.key,
    covered: g.state !== "open",
  }));
  const openGroups = view.balance.groups.filter((g) => g.state === "open");

  /* The header's figures read from planView's totals (built above,
     with the row renderers): plan values as serif numerals, the
     guide as dashed badges in the stat strip — said once (M-143's
     numbers-twice half). */

  return (
    <>
    <section className="nut-card nut-rise section" aria-label="Your plan for today">
      <div className="section-head">
        <div className="section-head__main">
          <div className="eyebrow">Your plan</div>
          {/* Brief v7 N5 (M-142's H2 half): the header names the DAY,
              not the goal — the goal is stated once on the page, by
              the segmented control below (the one interactive
              statement, writing through usePlan.setGoal). */}
          <h2 className="section-head__title mt-1.5">Today's plan</h2>
        </div>
        <button
          type="button"
          className="nut-btn nut-btn-ghost nut-btn-sm"
          onClick={() => compose()}
        >
          <RefreshCw className="size-3.5" aria-hidden /> Suggest different meals
        </button>
      </div>

      <StatStrip
        planKcal={view.totals.plan.kcal}
        guideKcal={view.totals.guide.kcal}
        planProteinG={view.totals.plan.proteinG}
        guideProteinG={view.totals.guide.proteinG}
        waterMl={view.totals.plan.waterMl}
        meals={view.totals.plan.meals}
        showKcal={view.showKcal}
      />

      <SegmentedGoalControl current={chipGoal} onSelect={setGoal} />

      {staleness.stale ? (
        <div className="nut-plan-stale" role="status">
          {staleness.changed.includes("the plan method improved") ? (
            <p className="text-[length:var(--text-body)] leading-[var(--leading-body)] text-foreground">
              The plan method improved since this plan was made — regenerate to get the new
              composition.
            </p>
          ) : null}
          {staleness.changed.filter((c) => c !== "the plan method improved").length > 0 ? (
            <p className="text-[length:var(--text-body)] leading-[var(--leading-body)] text-foreground">
              Since this plan was made,{" "}
              {joinNames(staleness.changed.filter((c) => c !== "the plan method improved"))} changed
              — the plan below still uses the older numbers. Regenerate to bring it up to date.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Brief v7 N5: the header card ends here. The targets-estimate
          note that stood loose under the staleness block moves into
          the "How this plan is built" disclosure in the day card
          below (words unchanged) — the header carries the day, the
          figures and the goal control, nothing else. */}
    </section>

    {/* Water is a scene now, not a sentence (Brief v7 WATER; M-145's
        display half): the vase fills and the Bloom opens as the day's
        water is logged. The per-meal prose split is deleted — the
        plan's hydration figure itself is unchanged and is the
        panel's target. Brief v7 N5: the panel leaves the plan card
        and stands in the flow as the day's companion (§7.1: header →
        water → the day's path and meals), props and wiring exactly
        as built. Without a hydration schedule, the morning glass
        keeps its one honest line in the same slot. */}
    {plan.hydration ? (
      <WaterBloomPanel targetMl={plan.hydration.targetMl} />
    ) : plan.morning ? (
      <div className="mt-5">
        <p className="nut-group-label">Start of day</p>
        <p className="nut-note">
          On waking: a glass of water ({plan.morning.waterMl} ml), before anything else.
        </p>
      </div>
    ) : null}

    <section className="nut-card nut-rise section" aria-label="Your day">

      {/* Brief v7 N3: the day as a path (N2's DayPath, consuming the
          view's rail verbatim) replaces the P12 timeline list —
          retiring its "—" time cells (M-144). Two of the list's
          sentences keep their words under the path: the timeline's
          anchor note, and — when a hydration schedule exists — the
          morning glass the wake item used to carry as a suffix (the
          no-hydration case states it in the Start of day block
          above, so it is said once either way). Brief v7 N5: the
          path and the meals below it are the day card now — the
          plan's second shell section, after the water slot. */}
      <div>
        <p className="nut-group-label">Your day</p>
        <DayPath stops={view.rail} thumbFor={thumbFor} showKcal={view.showKcal} />
        {plan.hydration && plan.morning ? (
          <p className="nut-note">
            On waking: a glass of water ({plan.morning.waterMl} ml), before anything else.
          </p>
        ) : null}
        {plan.timeline ? (
          <p className="nut-note">
            {plan.timeline.anchor === "sleep_log"
              ? "Times follow your usual wake and bed times, from your sleep log."
              : "In the day's order — once your sleep log holds a few nights, the plan can put your usual times to it."}
          </p>
        ) : null}
      </div>

      {/* Brief v7 N3: the meals are rows in ONE panel (M-146), in
          planView's order (M-159) — no card inside the section's
          card, no second order anywhere on the page. */}
      <div className="meals-panel mt-5">{view.meals.map(mealRow)}</div>

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

      {showProposal && estimate && proposalDelta !== null && engineTdeeKcal !== null ? (
        <div className="nut-proposal" role="status">
          <p className="nut-group-label">Your real maintenance, from your record</p>
          <p className="mt-2 text-[length:var(--text-body)] leading-[var(--leading-body)] text-foreground">
            Over {estimate.spanDays} days ({shortDay(estimate.fromDate)} –{" "}
            {shortDay(estimate.toDate)}) you logged {estimate.loggedDays} days averaging{" "}
            {fmtInt(estimate.avgIntakeKcal)} kcal, and your weight{" "}
            {weightPhrase}. That puts your maintenance near{" "}
            <span className="font-semibold">
              {fmtInt(estimate.maintenanceKcal)} kcal
            </span>{" "}
            a day — {fmtInt(Math.abs(proposalDelta))} kcal{" "}
            {proposalDelta > 0 ? "above" : "below"} the {fmtInt(engineTdeeKcal)}{" "}
            kcal formula estimate behind your plan.
          </p>
          {proposalApplicable && proposedTargetKcal !== null ? (
            <p className="mt-2 text-[length:var(--text-body)] leading-[var(--leading-body)] text-foreground">
              Confirming shifts your daily target by {proposalDelta > 0 ? "+" : "−"}
              {fmtInt(Math.abs(proposalDelta))} kcal, to{" "}
              {fmtInt(proposedTargetKcal)} kcal — your goal pace stays the same, and
              the plan above keeps its current numbers until you compose again.
            </p>
          ) : (
            <p className="mt-2 text-[length:var(--text-body)] leading-[var(--leading-body)] text-foreground">
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
                className="nut-btn nut-btn-ghost nut-btn-sm"
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

      {/* Brief v4 Slice 5: the "What your plan learned" block that
          lived here is retired — the Metabolic Twin absorbed its
          conclusions as an insight strip (Part 3.4), its numbers
          live in the Twin's tiles, and its one action (Remove
          adjustment) moved with the adjustment row. The plan's
          learning still feeds composition exactly as before;
          only this second rendering of it is gone (M-83/M-84). */}

      {logError ? (
        <p className="nut-error mt-3" role="alert">
          {logError}
        </p>
      ) : null}

      <MoreDisclosure label="How this plan is built" className="mt-4">
        {/* Brief v7 N5: the targets-estimate note lives here now —
            protected honesty copy, words unchanged; it stood as a
            loose paragraph in the header until the shell split. */}
        <p className="nut-note">
          Targets are estimates from your body numbers (Mifflin–St Jeor) — a guide for the day, not a
          prescription.
          {plan.targetsSource === "body_profile"
            ? " This plan is built from your Trackers body numbers — the same targets that page shows."
            : ""}
        </p>
        <p className="nut-note">
          Plans are built from real dishes in Bloom's library — each dish's numbers are computed
          from its ingredients' USDA data — topped up with simple foods only where the dishes leave
          the day short. They are a starting point — log what you actually eat and your totals
          follow that.
        </p>
        {/* P14 (M-161): the one part of the plan's structure the
            person chooses — where the snack sits. One quiet row:
            a group label and the two-segment control. Changing it
            writes the preference; the plan above goes stale by
            name ("where your snack sits") and rebuilds on the
            "Suggest different meals" tap — never silently. */}
        <p className="nut-group-label mt-4">Snack sits</p>
        <SegmentedSnackControl current={snackPlacement} onSelect={setSnackPlacement} />
      </MoreDisclosure>

      {selectedDish ? (
        <DishDetailSheet
          dish={selectedDish.dish}
          day={plan.day}
          onClose={() => setSelectedDish(null)}
          onLog={(dish) => logDishIdea(selectedDish.meal, dish)}
        />
      ) : null}
    </section>

    {/* Your whole day (M-162): the plan's caretaker section — the
        sleep window, the movement target and the evening's care
        lines, derived from the Trackers goals, the wake-time
        preference and this plan's own meals and timeline (see
        DayCaretakerSection). It sits beside the day card whose
        "How this plan is built" disclosure explains the food;
        every §7.1 relative order the shell guard pins stands. */}
    <DayCaretakerSection plan={plan} />

    {/* Today's balance (brief v7 N4): the day's balance as the
        signature viz ONLY — the Bloom flower fed by planView's ONE
        groups array, the covered count in the header (the same
        array's non-open count, so headline, petals and chips agree
        by construction), the two-layer guideline meters, one
        legend, one source chip, and the open groups as dashed
        chips. ZERO paragraphs: every sentence this section used to
        carry is either the viz now or was a restatement of a
        figure stated once elsewhere (M-138, M-140, M-151, M-152).
        The section always renders with a plan — the flower is the
        day's balance whether or not anything fell short. */}
    <section className="nut-card nut-rise section" aria-label="Today's balance">
      <div className="section-head">
        <div className="section-head__main">
          <h2 className="section-head__title">Today's balance</h2>
        </div>
        <div className="balance__count balance__count--head" data-metric="balance-covered-count">
          <b>{view.balance.inPlan}</b>
          <span>of {view.balance.total} food groups covered</span>
        </div>
      </div>
      <div className="balance mt-3">
        <div className="balance__flower">
          <BloomFlower groups={flowerGroups} />
        </div>
        <div className="balance__bars">
          {view.balance.meters.map((m) => (
            <BalanceMeter key={m.key} meter={m} />
          ))}
        </div>
      </div>
      <div className="bal-legend">
        <span className="bal-legend__item">
          <i className="bal-swatch is-eaten" aria-hidden="true" /> Logged
        </span>
        <span className="bal-legend__item">
          <i className="bal-swatch is-planned" aria-hidden="true" /> With the plan
        </span>
        <span className="bal-legend__item">
          <i className="bal-swatch is-target" aria-hidden="true" /> Guideline
        </span>
        <span className="nut-badge src-chip">ICMR-NIN guideline</span>
      </div>
      {openGroups.length > 0 ? (
        <div className="balance__open">
          <div className="nut-group-label">Open groups</div>
          <ul className="balance__open-list">
            {openGroups.map((g) => (
              <li key={g.key} className="nut-badge" data-open-group>
                {g.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>

    {/* How today's plan was adjusted (brief v7 N4): the plan's ONE
        adjustments array as rows worded by `adjustmentCopy` — at
        most three, gates first. With none, ONE empty row states
        the case (never a paragraph, never a card of its own —
        M-154): the page's structure holds day to day. */}
    <section className="nut-card nut-rise section" aria-label="How today's plan was adjusted">
      <div className="section-head">
        <div className="section-head__main">
          <h2 className="section-head__title">How today's plan was adjusted</h2>
        </div>
      </div>
      {adjustmentCopies.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {adjustmentCopies.map((copy) => (
            <AdjustmentRow key={copy.title} copy={copy} />
          ))}
        </div>
      ) : (
        <div className="empty-row mt-3" role="status">
          <span className="empty-row-icon" aria-hidden="true">
            <Check className="size-4" />
          </span>
          <p className="empty-row-text">
            No adjustments today — the plan follows your Assessment as set.
          </p>
        </div>
      )}
    </section>
    </>
  );
}
