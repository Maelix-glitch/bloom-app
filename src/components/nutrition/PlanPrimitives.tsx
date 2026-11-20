/**
 * PlanPrimitives — Brief v7 Slice N2's chrome for Nutrition › Plan.
 *
 * Four primitives, one job each, no data of their own:
 *
 * - `SegmentedGoalControl` (M-142's pill half): the goal as ONE
 *   segmented control — real radios in a radiogroup (arrow keys are
 *   the platform's), a NEUTRAL thumb that slides by transform over
 *   180ms, no gold anywhere. It reports through the same single
 *   callback the old chips used, which the section wires to
 *   `usePlan.setGoal` — the one write path (body profile + the
 *   Assessment answers patch), unchanged.
 * - `SegmentedSnackControl` (P14, M-161): the same pattern at two
 *   segments — where the day's snack sits, "In the longest gap" or
 *   "In the morning" — living inside the "How this plan is built"
 *   disclosure and writing through `usePlan.setSnackPlacement`.
 * - `MoreDisclosure` (M-157): the page's ONE disclosure. A button
 *   with aria-expanded over a hairline, a chevron that rotates, and
 *   content that fades in — replacing every native <details> on the
 *   page ("How this plan is built", "How the twin works",
 *   "Past runs").
 * - `StatStrip`: the plan header's figures as one row of serif
 *   numerals with hairline dividers. Guide values ride as DASHED
 *   badges (rule 4: dashed = estimated/planned), carrying the
 *   data-metric names the old prose sentence carried. Water reads
 *   through fmtLitres. Under hideCalories the Energy cell leaves
 *   entirely — no kcal figure anywhere in the strip.
 * - `CookingBadge` (M-139, brief v7 N3): a dish's cooking tag from
 *   its own §10.4 pins (`dishPreparationNeeds`) — "No cooking" or
 *   "Cooked · N min" — turned amber with a dashed underline when
 *   the dish sits outside the kitchen answers the plan was composed
 *   against. Display only: the badge judges, it never selects.
 * - `DayPath` (M-144/M-159, primitive half): the day as a path —
 *   planView's rail stops down a hairline track that fills (scaleY,
 *   transform only) to the furthest reached stop. Done wears a sage
 *   check, "now" wears the page's ONLY looping animation (a soft
 *   pulse, stilled under reduced motion), estimated times are
 *   dashed-underlined, word labels stand where no time is known —
 *   never a dash. Meal stops link to `#meal-{slot}`; N3 hangs the
 *   real rows on those anchors and mounts this on the page.
 *
 * Craft notes (the owner's standard — principles, not copies):
 * spacing rides the space tokens, figures are the display serif,
 * depth is one hairline and one raised surface, motion is
 * transform/opacity at house durations, and nothing loops except
 * the "now" pulse.
 */

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";

import { GOAL_LABEL, GOAL_OPTIONS } from "@/lib/assessment/questions";
import { fmtGrams, fmtInt, fmtLitres } from "@/lib/format";
import type { PlanGoalProfile, SnackPlacement } from "@/lib/nutrition";
import { dishPreparationNeeds, type Dish } from "@/lib/nutrition/dishes";
import type { PlanRailStop } from "@/lib/nutrition/planView";
import type { CookingAbility, PrepTimeMaxMinutes } from "@/lib/vitalis/domain/profile";

/* ------------------------- segmented goal -------------------------- */

/** The control's options, in the chips' order. Visible labels are
 *  the short forms a segmented control can carry in one row; the
 *  full GOAL_LABEL stays as each radio's accessible name and the
 *  hint as its title, exactly as the chips presented them. */
const SEG_OPTIONS: readonly { value: PlanGoalProfile; short: string }[] = [
  { value: "lose", short: "Lose weight" },
  { value: "maintain", short: "Maintain" },
  { value: "gain", short: "Gain weight" },
  { value: "recomp", short: "Build muscle" },
];

export function SegmentedGoalControl({
  current,
  onSelect,
}: {
  current: PlanGoalProfile | null;
  onSelect: (goal: PlanGoalProfile) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLLabelElement | null)[]>([]);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  const index = SEG_OPTIONS.findIndex((o) => o.value === current);

  /* The thumb is measured, not computed: segment widths follow the
     labels, so the thumb takes the selected segment's own box and
     slides to it by transform. Re-measured on selection change and
     on resize; until the first measure it simply isn't shown. */
  useLayoutEffect(() => {
    const measure = () => {
      const el = index >= 0 ? optionRefs.current[index] : null;
      setThumb(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [index]);

  return (
    <div className="seg mt-4" role="radiogroup" aria-label="Your goal" ref={trackRef}>
      <span
        className="seg__thumb"
        aria-hidden="true"
        data-index={index}
        style={{
          transform: `translateX(${thumb?.x ?? 0}px)`,
          width: thumb?.w ?? 0,
          opacity: thumb ? 1 : 0,
        }}
      />
      {SEG_OPTIONS.map((option, i) => {
        const selected = current === option.value;
        const hint = GOAL_OPTIONS.find((o) => o.value === option.value)?.hint;
        return (
          <label
            key={option.value}
            ref={(el) => {
              optionRefs.current[i] = el;
            }}
            className="seg__option"
            data-selected={selected || undefined}
            title={hint}
          >
            <input
              type="radio"
              name="plan-goal"
              className="seg__input"
              aria-label={GOAL_LABEL[option.value]}
              data-selected={selected || undefined}
              checked={selected}
              onChange={() => onSelect(option.value)}
            />
            <span className="seg__label" aria-hidden="true">
              {option.short}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/* ----------------------- segmented snack sits ----------------------- */

/** The snack-placement options (P14, M-161), in the order the row
 *  presents them: the rule the plan has always used first, the
 *  morning preference second. The labels are the person's own
 *  words for the choice — where the snack sits — never the
 *  composer's rule names. */
const SNACK_SEG_OPTIONS: readonly { value: SnackPlacement; label: string }[] = [
  { value: "widest_gap", label: "In the longest gap" },
  { value: "morning", label: "In the morning" },
];

/**
 * The snack-placement control: the goal control's own pattern —
 * real radios in a radiogroup, a NEUTRAL thumb that slides by
 * transform, no gold anywhere (a setting, not an action). It
 * lives inside the "How this plan is built" disclosure as one
 * quiet row: the plan's structure is explained there, and this
 * is the one part of that structure the person can choose. It
 * reports through `usePlan.setSnackPlacement` — the preference
 * write — and never regenerates silently: the stored plan goes
 * stale by name ("where your snack sits") until the person's
 * own "Suggest different meals" tap rebuilds it.
 */
export function SegmentedSnackControl({
  current,
  onSelect,
}: {
  current: SnackPlacement;
  onSelect: (placement: SnackPlacement) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLLabelElement | null)[]>([]);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  const index = SNACK_SEG_OPTIONS.findIndex((o) => o.value === current);

  /* The thumb is measured, not computed — the goal control's own
     discipline, for the same reason: segment widths follow the
     labels. */
  useLayoutEffect(() => {
    const measure = () => {
      const el = index >= 0 ? optionRefs.current[index] : null;
      setThumb(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [index]);

  return (
    <div className="seg" role="radiogroup" aria-label="Snack sits" ref={trackRef}>
      <span
        className="seg__thumb"
        aria-hidden="true"
        data-index={index}
        style={{
          transform: `translateX(${thumb?.x ?? 0}px)`,
          width: thumb?.w ?? 0,
          opacity: thumb ? 1 : 0,
        }}
      />
      {SNACK_SEG_OPTIONS.map((option, i) => {
        const selected = current === option.value;
        return (
          <label
            key={option.value}
            ref={(el) => {
              optionRefs.current[i] = el;
            }}
            className="seg__option"
            data-selected={selected || undefined}
          >
            <input
              type="radio"
              name="plan-snack-placement"
              className="seg__input"
              aria-label={option.label}
              data-selected={selected || undefined}
              checked={selected}
              onChange={() => onSelect(option.value)}
            />
            <span className="seg__label" aria-hidden="true">
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/* ---------------------------- disclosure --------------------------- */

export function MoreDisclosure({
  label,
  children,
  defaultOpen = false,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <div className={`more${className ? ` ${className}` : ""}`} data-open={open || undefined}>
      <button
        type="button"
        className="more__head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!open)}
      >
        <span className="more__label">{label}</span>
        <ChevronDown className="more__chev size-4" aria-hidden />
      </button>
      {open ? (
        <div className="more__body" id={bodyId}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------- stat strip --------------------------- */

export function StatStrip({
  planKcal,
  guideKcal,
  planProteinG,
  guideProteinG,
  waterMl,
  meals,
  showKcal = true,
}: {
  planKcal: number;
  guideKcal: number;
  planProteinG: number;
  guideProteinG: number;
  waterMl: number | null;
  meals: number;
  showKcal?: boolean;
}) {
  return (
    <dl className="stat-strip">
      {showKcal ? (
        <div className="stat-strip__cell" data-cell="energy">
          <dt className="stat-strip__label">Energy</dt>
          <dd className="stat-strip__row">
            <span className="stat-strip__value">
              {fmtInt(planKcal)}
              <small> kcal</small>
            </span>
            <span className="stat-strip__guide" data-metric="plan-kcal-guide">
              guide {fmtInt(guideKcal)}
            </span>
          </dd>
        </div>
      ) : null}
      <div className="stat-strip__cell" data-cell="protein">
        <dt className="stat-strip__label">Protein</dt>
        <dd className="stat-strip__row">
          <span className="stat-strip__value">
            {fmtInt(Math.round(planProteinG))}
            <small> g</small>
          </span>
          <span className="stat-strip__guide" data-metric="plan-protein-guide">
            guide {fmtGrams(guideProteinG)} g
          </span>
        </dd>
      </div>
      {waterMl !== null ? (
        <div className="stat-strip__cell" data-cell="water">
          <dt className="stat-strip__label">Water</dt>
          <dd className="stat-strip__row">
            <span className="stat-strip__value">{fmtLitres(waterMl)}</span>
          </dd>
        </div>
      ) : null}
      <div className="stat-strip__cell" data-cell="meals">
        <dt className="stat-strip__label">Meals</dt>
        <dd className="stat-strip__row">
          <span className="stat-strip__value">{fmtInt(meals)}</span>
        </dd>
      </div>
    </dl>
  );
}

/* --------------------------- cooking badge -------------------------- */

/** The kitchen answers a badge is judged against — the plan's own
 *  recorded snapshot (`plan.inputs`), the same answers the composer
 *  judged the dish pool by. Null fields mean unanswered: no
 *  judgement is made on an answer the person never gave. */
export interface KitchenAnswers {
  cookingAbility: CookingAbility | null;
  prepTimeMaxMinutes: PrepTimeMaxMinutes | null;
}

/**
 * A dish's cooking tag, and whether it conflicts with the person's
 * kitchen answers (M-139). The conflict mirrors the kitchen gates'
 * own terms (plan.ts §10): a cooked dish under a "no cooking"
 * answer, or a dish whose time runs past the prep-time answer. The
 * §10 ladder may still serve such a dish — the plan says so in its
 * adjustments — but the dish no longer wears the conflict silently.
 */
export function cookingBadgeFor(
  dish: Dish,
  answers: KitchenAnswers | null,
): { label: string; conflict: boolean } {
  const needs = dishPreparationNeeds(dish);
  const label = needs.noCook ? "No cooking" : `Cooked · ${dish.timeMinutes} min`;
  const conflict =
    answers !== null &&
    ((answers.cookingAbility === "none" && !needs.noCook) ||
      (answers.prepTimeMaxMinutes !== null && dish.timeMinutes > answers.prepTimeMaxMinutes));
  return { label, conflict };
}

export function CookingBadge({
  dish,
  answers,
}: {
  dish: Dish;
  answers: KitchenAnswers | null;
}) {
  const badge = cookingBadgeFor(dish, answers);
  return (
    <span
      className="cook-badge"
      data-cooking-badge
      data-conflict={badge.conflict || undefined}
      title={
        badge.conflict
          ? "This sits outside the kitchen answers on your Assessment"
          : undefined
      }
    >
      {badge.label}
    </span>
  );
}

/* ----------------------------- day path ---------------------------- */

export function DayPath({
  stops,
  thumbFor,
  showKcal = true,
}: {
  stops: readonly PlanRailStop[];
  /** A reviewed photo for a stop (N3 passes the meal rows' dish
   *  photos); null = no thumb, the marker carries the stop alone. */
  thumbFor?: (stop: PlanRailStop) => string | null;
  showKcal?: boolean;
}) {
  /* The track fills to the furthest REACHED stop — a logged meal,
     or the "now" stop the day has arrived at — as a fraction of the
     span between the first and last markers. */
  const reached = stops.reduce(
    (acc, s, i) => (s.state === "done" || s.state === "now" ? i : acc),
    -1,
  );
  const fill = stops.length > 1 && reached >= 0 ? reached / (stops.length - 1) : 0;
  return (
    <ol className="day-path">
      <span className="day-path__track" aria-hidden="true">
        <span
          className="day-path__fill"
          data-fill={fill}
          style={{ transform: `scaleY(${fill})` }}
        />
      </span>
      {stops.map((stop) => {
        const thumb = thumbFor ? thumbFor(stop) : null;
        return (
          <li
            key={stop.key}
            className="day-path__stop"
            data-key={stop.key}
            data-state={stop.state}
          >
            <span className="day-path__marker" aria-hidden="true">
              {stop.state === "done" ? (
                <Check className="day-path__check size-4" aria-hidden />
              ) : stop.state === "now" ? (
                <>
                  <span className="day-path__pulse" aria-hidden="true" />
                  <span className="day-path__dot" aria-hidden="true" />
                </>
              ) : null}
            </span>
            {thumb ? (
              <img className="day-path__thumb" src={thumb} alt="" loading="lazy" />
            ) : null}
            <span className="day-path__body">
              {stop.meal ? (
                <a className="day-path__label" href={`#meal-${stop.meal}`}>
                  {stop.label}
                </a>
              ) : (
                <span className="day-path__label">{stop.label}</span>
              )}
              <span
                className="day-path__when"
                data-estimated={stop.whenEstimated || undefined}
              >
                {stop.whenText}
              </span>
              {showKcal && stop.kcal !== undefined ? (
                <span className="day-path__kcal">{fmtInt(Math.round(stop.kcal))} kcal</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
