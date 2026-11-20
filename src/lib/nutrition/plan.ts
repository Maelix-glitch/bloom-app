/**
 * Nutrition — goal-based plan generation (P1, spec v2 §6/§10).
 *
 * A plan is computed, never imagined: every number in it comes from the
 * deterministic targets engine (`targetsFor`, safety-gated, over the same
 * `bodyTargetsOf` the rest of Bloom uses) or from the nutrition lib's own
 * portion math over foods whose values carry provenance. There is no AI
 * anywhere in this module, and no food value is invented: suggestions are
 * drawn only from the user's own foods and the USDA reference set, sized
 * in grams, with their nutrients computed by `nutrientsForGrams` — the
 * same math the log uses, so a suggestion and the entry it becomes can
 * never disagree.
 *
 * The gate order is the spec's Stage-3 rule, in order:
 *   1. A substantive safety block refuses outright — safety overrides any
 *      plan request, every time. An absence-only block (the person was
 *      never asked) is NOT substantive: like the Nutrition tab, the plan
 *      falls back to the body-profile targets, so the surfaces agree.
 *   2. No goal, no plan — the missing inputs are named, never guessed.
 *   3. No targets from either path, no plan — again, named.
 *
 * A plan is a dated daily structure: per-meal kcal/protein splits that sum
 * EXACTLY to the day's targets (largest-remainder reconciliation, pinned
 * by tests), plus food suggestions per meal.
 *
 * Composition (P2) is layered, patterned and capped, grounded in the
 * balanced-diet composition research (ICMR-NIN My Plate / DGI-2024, ISSN
 * protein distribution, BNF portions): each main meal is built as a grain
 * base + a protein layer + at least two vegetables + a measured fat + a
 * dairy extra, filtered by the person's dietary pattern (encoded on
 * ingredient identity, never on veg/non-veg labels), sized inside hard
 * per-food-group portion caps, rotated deterministically by day, and
 * checked against the ICMR day floors it aims at — with any shortfall
 * named on the plan rather than padded over. Where a rule below is an
 * engine derivation rather than a guideline quotation, the comment says
 * so. A meal no clean food fits stays empty with an honest note — the
 * plan never pads itself with a fabricated dish.
 *
 * Maturity (P3) then reconciles what composition produced: each main
 * meal is capped at a plate a person assembles (8 suggestions), a
 * protein shortfall under 95% of the target is actively closed
 * (resize → swap → add, inside the same caps), and the day's energy is
 * trimmed or fed back to within ±3% of its guide — floors unbroken,
 * protein and vegetables never trimmed. Whatever still misses is
 * named in the plan's notes with its true figure.
 *
 * Dish-first (P5): when the caller supplies the dish library, a main
 * meal is composed from DISHES first — a protein anchor dish, plus a
 * rice/bread base and a side where the meal's energy share calls for
 * them — chosen under the same gates the plan applies everywhere
 * (the dish suits the person's pattern, every ingredient line sits in
 * the eligible pool, the person's stated budget tier is a hard cap).
 * A dish's numbers are its computed `dishNutrients` — the day's totals
 * are the dishes' totals, so the plan and the dish library can never
 * disagree. Simple foods return only as a subordinate top-up layer
 * that closes the day's remaining protein/energy gap, and the layered
 * food composition above survives as the per-meal fallback for a slot
 * no suitable dish can fill — never an empty meal while food fits.
 *
 * One dish per meal (P8, the quality rebuild): the P5 stack — an
 * anchor plus a base plus a side, each at exactly one serving — put
 * plates on the plan that no kitchen serves (a Japanese egg sandwich
 * beside an Amritsari kulcha) and left the day's totals to whatever
 * the stack happened to sum to, because nothing could trim a dish.
 * The v8 composer serves ONE dish per main meal, portion-scaled in
 * quarter-serving steps, chosen by an explicit fit cost against the
 * meal's own share of the day (protein error weighted heaviest —
 * protein-first), and then repairs the day's dish scales greedily
 * until the day lands inside its bands (energy ±5%, protein
 * 95–110%) or no honest step remains. The Assessment's cuisine
 * preference joins as a ranking bonus only — it can break a tie
 * toward the person's region, never exclude a dish. And before the
 * plan is returned, every served dish is re-verified against the
 * person's pattern: the pool already guarantees it, and the plan
 * now proves it, meal by meal.
 *
 * Behavioural shaping (P10, spec §10): the Assessment's behavioural
 * profile joins composition the same disciplined way — gates and
 * ranking terms, never target changes. The kitchen answers gate the
 * dish pool through the one preparation-needs function (equipment,
 * no-cook) and a weekday prep-time cap that relaxes in stated
 * stages rather than emptying the plan; the hunger pattern tilts
 * the meal split; basic cooking experience and a low confidence
 * reshape the pick cost; a sweet craving steers the snack. Every
 * shaping is derived from an answer the person actually gave, and
 * every relaxation is named in the plan's notes.
 */

import { fmtCount, fmtGrams, fmtKcalApprox } from "@/lib/format";
import { dishPassesModes, type ModeId } from "@/lib/modes/modes";
import {
  PLAN_REASON_KINDS,
  reasonDetail,
  reasonDetails,
  type KitchenRelaxationStage,
  type PlanReason,
} from "@/lib/reasons";
import { getPref, setPref } from "@/lib/prefs";
import {
  COOKING_ABILITIES,
  CUISINE_PREFERENCES,
  EATING_SETTINGS,
  HUNGER_PATTERNS,
  PREP_TIME_BANDS,
  profileHeightCm,
  profileTargetWeightKg,
  profileWeightKg,
  type ActivityLevel,
  type BehaviouralProfile,
  type CookingAbility,
  type CravingKind,
  type CuisinePreference,
  type DietaryPattern,
  type EatingSetting,
  type EquipmentItem,
  type HealthProfile,
  type HungerPattern,
  type PrepTimeMaxMinutes,
  type Sex,
  type VitalisGoal,
} from "@/lib/vitalis/domain/profile";
import {
  ABSENCE_BLOCK_RULE_IDS,
  SAFETY_CLASSES,
  hasSubstantiveBlock,
  type SafetyAssessment,
  type SafetyClass,
} from "@/lib/vitalis/domain/safety";
import { missingBodyFields, type BodyTargetsOutcome } from "@/lib/vitalis/calc/body";
import {
  BUDGET_TIER_1_MAX_PER_SERVING,
  BUDGET_TIER_2_MAX_PER_SERVING,
  dishNutrients,
  dishPatterns,
  dishPreparationNeeds,
  dishProvenance,
  type Dish,
  type DishCategory,
} from "./dishes";
import { PROTEIN_WAVE_DISH_IDS } from "./data/dishLibrary";
import { newNutritionId } from "./ids";
import { nutrientsForGrams } from "./math";
import { dishRegion, type DishRegion } from "./regions";
import { dishIsGravyStyle } from "./gravyStyle";
import { isRealDayKey, parseEntryNutrients, parseFoodProvenance } from "./parse";
import { MICRO_RICH_SHARE, planLearningFor, type PlanLearning } from "./planAdaptation";
import { isRawBasisFood } from "./preparation";
import { adjustedTargets } from "./targetAdjustment";
import { nutritionTargetsFromOutcome, type NutritionTargets } from "./targets";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import {
  MEALS,
  type Food,
  type FoodClassification,
  type FoodGroup,
  type FoodProvenance,
  type LogEntry,
  type Meal,
  type Nutrients,
} from "./types";

/* --------------------------------- shapes --------------------------------- */

/** Which target profile produced a plan's numbers. `general_health` runs
 *  on the maintenance profile (the adapter's honest reading: no deficit,
 *  no surplus) while keeping its own name as the plan's stated goal. */
export type PlanGoalProfile = "lose" | "gain" | "maintain" | "recomp";

export function goalProfileOf(goal: VitalisGoal): PlanGoalProfile {
  return goal === "general_health" ? "maintain" : goal;
}

/** The generation inputs a plan was made from, kept beside it so a later
 *  change is detectable and nameable (see `planStaleness`). */
export interface PlanInputsSnapshot {
  goal: VitalisGoal | null;
  ageYears: number | null;
  sex: Sex;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  activity: ActivityLevel | null;
  rateKgPerWeek: number;
  mealsPerDay: number | null;
  dietaryPattern: DietaryPattern | null;
  /** The Assessment's cuisine preference (P8): a ranking taste, not
   *  a target-bearing input — recorded so a change names itself in
   *  the staleness check, and deliberately NOT part of the inputs
   *  fingerprint (like the recent log, it shapes selection only;
   *  adding it to the fingerprint would refuse every plan stored
   *  before the question existed). Absent on pre-P8 snapshots. */
  cuisinePreference?: CuisinePreference | null;
  /** The composition-shaping behavioural answers (P10, spec §10),
   *  recorded on the cuisine precedent exactly: selection-shaping
   *  only, never target-bearing, deliberately NOT part of the
   *  inputs fingerprint, and named by the staleness check when one
   *  changes. Equipment is stored as a sorted comma-joined string
   *  so the comparison is order-insensitive. Absent on pre-P10
   *  snapshots. */
  prepTimeMaxMinutes?: PrepTimeMaxMinutes | null;
  kitchenEquipment?: string | null;
  cookingAbility?: CookingAbility | null;
  eatingSetting?: EatingSetting | null;
  hungerPattern?: HungerPattern | null;
  confidence?: number | null;
  /** The day timeline's clock anchor (P12): the person's usual
   *  wake and bed times from their own sleep log, when the log
   *  could speak. Recorded on the cuisine precedent exactly —
   *  scheduling-shaping only, never target-bearing, deliberately
   *  NOT part of the inputs fingerprint — and named by the
   *  staleness check when they change. Null when the day was
   *  anchored relatively. Absent on pre-P12 snapshots. */
  wakeTime?: string | null;
  bedTime?: string | null;
  /** The snack-placement preference the day was composed under
   *  (P14), recorded on the wake/bed precedent exactly —
   *  scheduling-shaping only, never target-bearing, deliberately
   *  NOT part of the inputs fingerprint — and named by the
   *  staleness check when it changes. Absent on pre-P14
   *  snapshots, which read as the default they were composed
   *  under ("widest_gap"). */
  snackPlacement?: SnackPlacement | null;
  safetyClassification: SafetyClass;
  targetsKcal: number;
  targetsProteinG: number;
}

/** The composition layer a suggestion belongs to (P2). Main meals are
 *  built in layers — a grain base, the protein layer, vegetables, and the
 *  finishing touches (measured fat, dairy extra, breakfast fruit/nuts);
 *  snack items carry `snack`; P5 top-up foods — the simple foods that
 *  close a dish-composed day's remaining gap — carry `topup`. Absent on
 *  plans stored by the P1 composer, which suggested without layers. */
export type SuggestionLayer = "base" | "protein" | "vegetables" | "finishing" | "snack" | "topup";

export interface PlanSuggestion {
  foodId: string;
  name: string;
  grams: number;
  /** Computed by the lib's portion math at generation time. */
  nutrients: Nutrients;
  provenance: FoodProvenance;
  layer?: SuggestionLayer;
}

/** The role a dish plays in a dish-composed meal. Since P8 the one
 *  dish of a main meal is always the `anchor` — it IS the meal.
 *  The `side` role remains in the type because plans stored by
 *  the P5–P7 composers carry it and must keep parsing and
 *  rendering exactly as they were written. The `base` role is
 *  live again since method 14 — not the P5 stack revived, but
 *  the one accompaniment a gravy anchor is served (see
 *  accompanimentFor). */
export type PlanDishRole = "anchor" | "base" | "side";

/**
 * One dish placed in a plan meal. Its nutrients are the dish's own
 * computed `dishNutrients` at generation time, scaled by `servings`,
 * under the recipe provenance: the plan's numbers ARE the library's
 * numbers for the same dish, by construction. The P5 composer served
 * exactly 1 serving and stacked up to three dishes per meal; the P8
 * composer serves ONE dish per main meal and scales its servings
 * (0.5–2.0 in quarter steps) to fit the meal's share of the day.
 */
export interface PlanDish {
  dishId: string;
  /** The dish's English name, as the library states it. */
  name: string;
  /** The dish's Hindi name, as the library states it. */
  hindi: string;
  role: PlanDishRole;
  /** Servings of the dish in this meal (P8: a quarter-step scale in
   *  [0.5, 2.0]; P5–P7 plans always carry 1). */
  servings: number;
  /** `dishNutrients(dish)` for `servings` servings, computed at
   *  generation time — never stored on the dish itself. */
  nutrients: Nutrients;
  provenance: FoodProvenance;
}

export interface PlanMeal {
  meal: Meal;
  /** This meal's share of the day's targets. Meals sum exactly to them. */
  kcal: number;
  proteinG: number;
  /** The meal's dishes (P5) — the meal itself, when a suitable dish
   *  filled its slots. Empty on food-composed meals (the fallback, and
   *  every plan stored before P5). */
  dishes: PlanDish[];
  suggestions: PlanSuggestion[];
  /** Set when no clean food fits this meal — the honest empty state.
   *  The string is DERIVED from `noteReason` through reasons.ts at
   *  compose time (brief v4); it is kept on the stored shape so
   *  older readers keep working. */
  note: string | null;
  /** The meal note as structured data (brief v4). Absent on plans
   *  stored before reasons existed — those carry only `note`. */
  noteReason?: PlanReason | null;
}

/** The day's opening element (P11): what the plan asks first, before
 *  breakfast — a glass of water on waking. The amount is the app's
 *  own glass (250 ml — the measure the water tracker and the voice
 *  commands both use), never a prescription invented for the plan. */
export interface PlanMorning {
  /** Water on waking, in ml. Part of the day's hydration total
   *  whenever a hydration schedule exists. */
  waterMl: number;
}

/** The day's water, scheduled (P11): the in-app water target — the
 *  body-targets figure (35 ml/kg + activity, the number Trackers
 *  shows) — split into the wake-up glass and a with-meals amount
 *  per meal slot. `wakeMl + Σ perMeal.ml === targetMl === totalMl`
 *  exactly; the parser refuses a schedule that does not sum. */
export interface PlanHydration {
  /** The day's water target in ml, from the targets' own source. */
  targetMl: number;
  /** Water on waking in ml — the morning element's glass. */
  wakeMl: number;
  /** Water with each of the day's meals, in day order. */
  perMeal: { meal: Meal; ml: number }[];
  /** wakeMl + Σ perMeal.ml — always equal to targetMl. */
  totalMl: number;
}

/** One stop on the day's timeline (P12). The timeline schedules
 *  the plan the composer already made — it adds no food and moves
 *  no totals; it says WHEN the day's pieces happen, from waking to
 *  sleep. */
export type PlanTimelineKind = "wake" | "meal" | "wind_down" | "sleep";

export interface PlanTimelineItem {
  kind: PlanTimelineKind;
  /** The meal slot, on meal items. */
  meal?: Meal;
  /** Clock time "HH:MM" on a sleep-log-anchored day; null on a
   *  relative day — no clock was known, so none is shown. */
  time: string | null;
  /** The item's name as the plan states it: "On waking",
   *  "Breakfast", "Mid-morning snack", "Wind down", "Bedtime". */
  label: string;
}

export interface PlanTimeline {
  /** Where the day's frame came from: the person's own usual wake
   *  and bed times from their sleep log ("sleep_log"), or no clock
   *  at all ("relative") — the anchors are then the day's own
   *  structure, and the labels say so. */
  anchor: "sleep_log" | "relative";
  items: PlanTimelineItem[];
}

/** Where the day's snack sits (P14): the widest-gap rule that has
 *  placed it since P12 ("widest_gap", the default), or the
 *  person's morning preference ("morning") — the snack in the
 *  breakfast→lunch gap when that gap can hold it. A day-structure
 *  preference, stored in the prefs document like every other
 *  preference (see snackPlacement.ts); it shapes the timeline
 *  only — never a target, a split, or a portion. */
export type SnackPlacement = "widest_gap" | "morning";

export interface DailyPlan {
  id: string;
  /** The day this plan is for (a local day key). */
  day: string;
  generatedAt: string;
  goal: VitalisGoal;
  goalProfile: PlanGoalProfile;
  targets: NutritionTargets;
  /** Where the targets came from: the safety-gated Assessment path, or
   *  the Trackers body profile (the fallback the Nutrition tab also uses). */
  targetsSource: "assessment" | "body_profile";
  safetyClassification: SafetyClass;
  /** Non-blocking safety findings, in the classifier's own words. */
  cautions: string[];
  /**
   * Composition notes (P2): the day-level guideline aims the suggestions
   * could not reach — a vegetable/fruit/milk floor missed, too few
   * protein sources or food groups — named in plain words. A plan that
   * meets every aim carries none. Absent (read as empty) on P1 plans.
   * Since brief v4 these strings are DERIVED from `reasons` through
   * src/lib/reasons.ts at compose time; they remain on the shape for
   * every existing consumer (the Vitalis context among them).
   */
  notes: string[];
  /**
   * The plan's reasons as structured data (brief v4): adaptation,
   * learning, kitchen/budget relaxations, day structure and the
   * composition judgements, in that order. The composer emits data;
   * reasons.ts owns the words. Absent on plans stored before
   * reasons existed — those carry only `notes`, which the surfaces
   * fall back to.
   */
  reasons?: PlanReason[];
  /** The composition method that built this plan. Plans from an older
   *  method read as stale — see `planStaleness`. */
  methodVersion: number;
  /** The day's opening element (P11). Absent on plans stored before
   *  P11 — those plans are stale by method and regenerate into it. */
  morning?: PlanMorning;
  /** The day's hydration schedule (P11), present when the day's
   *  water target was known at generation time. Absent on pre-P11
   *  plans and on plans whose targets carried no water figure. */
  hydration?: PlanHydration;
  /** The day's timeline (P12): the composed day laid out from
   *  waking to sleep. Absent on plans stored before P12 — those
   *  plans are stale by method and regenerate into it. */
  timeline?: PlanTimeline;
  meals: PlanMeal[];
  inputs: PlanInputsSnapshot;
  fingerprint: string;
}

/** The current composition method: 1 = the P1 protein-density composer,
 *  2 = the P2 layered composer (patterns, food groups, portion caps),
 *  3 = the P3 maturity pass (energy reconciliation back to the target,
 *  protein-gap closing, an 8-item plate cap, egg-part portions, honest
 *  protein/energy shortfall notes), 4 = the P4 soy-form portion fix
 *  (cooked soy forms — tofu, tempeh, edamame — portioned as the cooked
 *  foods they are, not under the dry-pulse cap), 5 = the P5 dish-first
 *  composer (meals built from library dishes — a protein anchor, a
 *  base and a side — with simple foods demoted to a top-up layer and
 *  the layered food composition kept as the per-slot fallback),
 *  6 = the log-adaptive pass (the recent logged days bias selection —
 *  protein-first anchors and top-ups after a protein-shortfall log,
 *  no energy top-ups after an energy-overshoot log; targets, splits
 *  and every composition rule untouched, and with too little log the
 *  output is the P5 composer's exactly),
 *  7 = the deeper-learning pass (P7): dishes the person logs
 *  repeatedly lead the picks, a dish the last completed plan served
 *  but the log never took up sits further back, and dishes rich in a
 *  micronutrient the logged week runs short of are preferred — all
 *  still selection bias inside the same rules, targets moved only by
 *  a user-confirmed expenditure adjustment (see targetAdjustment),
 *  and with no usable log the output is the P6 composer's exactly),
 *  8 = the quality rebuild (P8): ONE dish per main meal, portion-
 *  scaled in quarter-serving steps to fit the meal's share, chosen
 *  by a protein-weighted fit cost with the P6/P7 learning signals
 *  and the Assessment's cuisine preference as ranking terms, then a
 *  day-level scale repair that lands the day inside its bands
 *  (energy ±5%, protein 95–110%) whenever the pool allows, and a
 *  hard pattern post-condition re-verified before the plan is
 *  returned. The P5 stack (anchor + base + side at one serving
 *  each) is retired: it composed plates no kitchen serves and left
 *  the day's totals unrepairable.
 *  9 = the preparation-basis pass (module 06, spec §4.4): a
 *  raw/dry-basis reference food — dry pulses, dry grains, flours,
 *  whose record grams are not plate grams — is never served as a
 *  plain-food suggestion, top-up or fallback layer. It remains
 *  searchable, loggable and a dish ingredient (recipe lines are
 *  cooked by the method). Dish composition and the top-up set are
 *  unchanged in shape; only the layered fallback loses the dry
 *  staples it used to present raw, and says so in its notes.
 *  Yield-based cooked conversion is the documented next step,
 *  gated on source verification (spec §4.2).
 *  10 = the behavioural pass (spec §10): the Assessment's kitchen
 *  answers gate the dish pool (equipment and no-cook through the
 *  one preparation-needs function; a prep-time cap on weekday
 *  plans, relaxed in stated stages and named in the notes when it
 *  is), basic cooking experience deprioritises long-method dishes
 *  in the pick cost, the stated hunger pattern tilts the meal
 *  split toward the hungry part of the day (totals unmoved), a
 *  low stated confidence leans the picks toward familiar dishes
 *  with less variety pressure, and a sweet craving makes the
 *  snack's flexible item prefer fruit. Targets never move; with
 *  no behavioural answers the output is the P9 composer's.
 *  11 = the day-completeness pass (P11, owner directive 2026-11-19):
 *  every plan carries a snack slot (a stated meals-per-day below
 *  four no longer drops it — the split renormalises and the notes
 *  name the addition), every plan opens with a morning element
 *  (a glass of water on waking) and, when the day's water target
 *  is known, a hydration schedule that sums exactly to it; the
 *  protein powders (PW-1) join the top-up pool, so a protein-short
 *  day can be closed by the densest honest food Bloom carries;
 *  and a final trim pulls a protein-overshooting day back toward
 *  its band, with the notes naming any overshoot that remains —
 *  before P11 an overshoot was not even named.
 *  12 = the full-day timeline pass (P12, owner directive
 *  2026-11-19): the composed day is laid out from waking to
 *  sleep — the waking glass, every meal in its place, a wind-down
 *  and the bedtime — as a stored timeline. When the person's
 *  sleep log holds a usual wake and bed time (their own logged
 *  nights, the median the trackers already compute), the items
 *  carry those clock times and the meals are spaced inside the
 *  window (>= 90 minutes between eating items, the last eating
 *  item at least two hours before bed); when no clock is known,
 *  the timeline is anchored relatively and shows no invented
 *  times. The timeline schedules the plan — it adds no food and
 *  moves no totals. The day guard's re-pick also changes: a meal
 *  is re-picked against the DAY's band cost, not its own split
 *  alone, so a protein-short day re-picks toward protein.
 *  13 = the dish-first repair (owner directive 2026-11-19, after
 *  the raw-plan diagnosis): the budget stops being a hard filter
 *  on the dish pool — it is a preference with a floor, widened
 *  with a named note when the in-budget pool cannot carry a day
 *  (and the cost heuristic is re-banded so flesh, fish and the
 *  protein powders price as themselves, not as almonds); the
 *  snack slot composes a real dish (shakes, protein snacks,
 *  breakfast dishes) and breakfast accepts the shake category,
 *  so the protein wave's shakes and snacks are servable at last;
 *  the kitchen gates relax in named stages (prep-time cap, then
 *  no-cook as a preference, then equipment) instead of handing
 *  the day to layered raw foods when an answer set starves the
 *  pool; at a high-protein guide the dedicated protein wave gets
 *  a bounded pick preference and the day cost prices the day's
 *  protein SPREAD across its main meals; and the top-up pass
 *  closes protein with whole foods before it ever reaches for a
 *  loose powder. Pattern, allergies, dislikes and Condition
 *  Modes stay absolute throughout — only preferences relax.
 *  14 = the accompaniment pass (owner directive 2026-11-20,
 *  M-160/M-161): a lunch or dinner whose anchor arrives in a
 *  sauce — gravy-style, derived from the dish's own recipe by
 *  dishIsGravyStyle (./gravyStyle) — is served ONE base beside
 *  it at a fixed half serving (steamed rice, or phulka where
 *  the anchor's region is the North's), counted in the meal and
 *  the day; the day repair then works over the based meals
 *  too, scaling anchors only, so the bands are re-struck with
 *  the base on the plate. Dry anchors (kebab / fry / roast
 *  style), one-pot anchors that already carry their grain,
 *  breakfast and the snack never take a base. The snack's
 *  place in the day also becomes the person's choice: the
 *  widest-gap rule stays the default, and a "morning"
 *  preference places the snack in the breakfast→lunch gap
 *  when that gap can hold it (see dayTimelineFor). */
export const PLAN_METHOD_VERSION = 14;

export type PlanRefusal =
  | {
      kind: "safety_blocked";
      classification: SafetyClass;
      requiresProfessionalReview: boolean;
      /** The substantive blocking findings, in the classifier's words. */
      findings: { ruleId: string; summary: string }[];
    }
  | {
      kind: "insufficient_data";
      /** Friendly names of the missing inputs, in a stable order. */
      missing: string[];
    };

export type PlanOutcome = { ok: true; plan: DailyPlan } | { ok: false; refusal: PlanRefusal };

/* ------------------------------ input snapshot ----------------------------- */

const round1 = (n: number) => Math.round(n * 10) / 10;

export function planInputsSnapshotOf(
  profile: HealthProfile,
  safety: SafetyAssessment,
  targets: NutritionTargets,
  anchor?: {
    wakeTime?: string | null;
    bedTime?: string | null;
    snackPlacement?: SnackPlacement | null;
  },
): PlanInputsSnapshot {
  const heightCm = profileHeightCm(profile);
  const weightKg = profileWeightKg(profile);
  const targetWeightKg = profileTargetWeightKg(profile);
  return {
    goal: profile.goal,
    ageYears: profile.ageYears,
    sex: profile.sex,
    heightCm: heightCm === null ? null : round1(heightCm),
    weightKg: weightKg === null ? null : round1(weightKg),
    targetWeightKg: targetWeightKg === null ? null : round1(targetWeightKg),
    activity: profile.activity,
    rateKgPerWeek: Math.round(profile.rateKgPerWeek * 100) / 100,
    mealsPerDay: profile.dietary.mealsPerDay,
    dietaryPattern: profile.dietary.pattern,
    cuisinePreference: profile.dietary.cuisinePreference,
    prepTimeMaxMinutes: profile.behavioural.prepTimeMaxMinutes,
    kitchenEquipment:
      profile.behavioural.equipment.length > 0
        ? [...profile.behavioural.equipment].sort().join(",")
        : null,
    cookingAbility: profile.behavioural.cookingAbility,
    eatingSetting: profile.behavioural.eatingSetting,
    hungerPattern: profile.behavioural.hungerPattern,
    confidence: profile.behavioural.confidence,
    safetyClassification: safety.classification,
    targetsKcal: targets.kcal,
    targetsProteinG: targets.proteinG,
    /* P12: the day's sleep anchor rides in the snapshot exactly as
       generatePlan records it (null when the day is relative), so
       a snapshot built here and one a plan carries agree key for
       key. */
    wakeTime: anchor?.wakeTime ?? null,
    bedTime: anchor?.bedTime ?? null,
    /* P14: the snack placement, on the same terms — the effective
       value (the default when no preference was passed), so the
       two snapshot builders agree here too. */
    snackPlacement: anchor?.snackPlacement ?? "widest_gap",
  };
}

/** A compact, deterministic fingerprint of the generation inputs. Two
 *  snapshots with the same fingerprint were made from the same inputs. */
export function fingerprintOfInputs(inputs: PlanInputsSnapshot): string {
  const canonical = JSON.stringify([
    inputs.goal,
    inputs.ageYears,
    inputs.sex,
    inputs.heightCm,
    inputs.weightKg,
    inputs.targetWeightKg,
    inputs.activity,
    inputs.rateKgPerWeek,
    inputs.mealsPerDay,
    inputs.dietaryPattern,
    inputs.safetyClassification,
    inputs.targetsKcal,
    inputs.targetsProteinG,
  ]);
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a-${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export interface PlanStaleness {
  stale: boolean;
  /** Friendly names of what changed since the plan was made. */
  changed: string[];
}

const CHANGED_LABELS: readonly (readonly [keyof PlanInputsSnapshot, string])[] = [
  ["goal", "your goal"],
  ["ageYears", "your age"],
  ["heightCm", "your height"],
  ["weightKg", "your weight"],
  ["targetWeightKg", "your target weight"],
  ["activity", "your activity level"],
  ["rateKgPerWeek", "your pace"],
  ["mealsPerDay", "your meals per day"],
  ["dietaryPattern", "your eating pattern"],
  ["cuisinePreference", "your cuisine preference"],
  ["prepTimeMaxMinutes", "your prep-time limit"],
  ["kitchenEquipment", "your kitchen equipment"],
  ["cookingAbility", "your cooking experience"],
  ["eatingSetting", "where you eat"],
  ["hungerPattern", "your hunger pattern"],
  ["confidence", "your confidence"],
  ["safetyClassification", "your safety answers"],
];

/** Compare a stored plan's inputs with the current ones. Sex is compared
 *  through its effect: a sex change moves the targets, which is the
 *  change the plan actually embodies, so it reports as "your targets".
 *  A plan built by an older composition method is stale on that ground
 *  alone — the method improved, and regenerating is how the person gets
 *  the better composition; the reason is named, never silent. */
export function planStaleness(plan: DailyPlan, current: PlanInputsSnapshot): PlanStaleness {
  const changed: string[] = [];
  if ((plan.methodVersion ?? 1) < PLAN_METHOD_VERSION) changed.push("the plan method improved");
  for (const [key, label] of CHANGED_LABELS) {
    if (plan.inputs[key] !== current[key]) changed.push(label);
  }
  /* P12: the timeline's clock anchor, compared nullish-tolerantly —
     snapshots stored before P12 carry no anchor keys at all, and
     "no anchor recorded" and "anchored relatively" are the same
     fact, not a change. */
  if (
    (plan.inputs.wakeTime ?? null) !== (current.wakeTime ?? null) ||
    (plan.inputs.bedTime ?? null) !== (current.bedTime ?? null)
  ) {
    changed.push("your usual sleep times");
  }
  /* P14: the snack placement, compared on the same nullish-
     tolerant terms — a pre-P14 snapshot carries no key, which is
     the default it was composed under, not a change. */
  if (
    (plan.inputs.snackPlacement ?? "widest_gap") !== (current.snackPlacement ?? "widest_gap")
  ) {
    changed.push("where your snack sits");
  }
  if (
    plan.inputs.targetsKcal !== current.targetsKcal ||
    plan.inputs.targetsProteinG !== current.targetsProteinG
  ) {
    changed.push("your targets");
  }
  return { stale: changed.length > 0, changed };
}

/* ------------------------------- meal splits ------------------------------- */

/** Base shares of the day per meal slot, before renormalising over the
 *  slots a person's meal count actually uses. */
const MEAL_SHARE: Record<Meal, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};

/** When fewer meals are eaten, the main meals are kept first: a two-meal
 *  day is lunch and dinner, a one-meal day is lunch. */
const SLOT_PRIORITY: readonly Meal[] = ["lunch", "dinner", "breakfast", "snack"];

/** The meal slots for a plan, in canonical day order. An unanswered
 *  meals-per-day gets the full four-slot structure. */
export function mealSlotsFor(mealsPerDay: number | null): Meal[] {
  const n =
    mealsPerDay === null
      ? MEALS.length
      : Math.min(MEALS.length, Math.max(1, Math.floor(mealsPerDay)));
  const chosen = new Set(SLOT_PRIORITY.slice(0, n));
  return MEALS.filter((meal) => chosen.has(meal));
}

/**
 * Split an integer total across shares by largest remainder: floor every
 * share, then hand the leftover units one at a time to the largest
 * fractional parts (ties break by slot order). The parts sum EXACTLY to
 * the total — a plan's meals never drift a kilocalorie from its targets.
 */
function splitUnits(total: number, shares: readonly number[]): number[] {
  const raw = shares.map((s) => total * s);
  const out = raw.map((r) => Math.floor(r));
  let remainder = total - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remainder > 0 && order.length > 0; k = (k + 1) % order.length) {
    out[order[k]!.i]! += 1;
    remainder -= 1;
  }
  return out;
}

export interface MealSplit {
  meal: Meal;
  kcal: number;
  proteinG: number;
}

/** The share of the day a stated hunger pattern may move toward the
 *  hungry slot (spec §10.2: up to 5 percentage points). A derivation
 *  at the spec's own ceiling: enough to feel, never enough to starve
 *  the day's other meals. */
const HUNGER_SHARE_SHIFT = 0.05;

/** The slot a hunger pattern points at; "steady" points nowhere. */
const HUNGER_SLOT: Record<Exclude<HungerPattern, "steady">, Meal> = {
  mornings: "breakfast",
  afternoons: "lunch",
  evenings: "dinner",
  nights: "snack",
};

/** Per-meal shares of the day's targets, reconciled to sum exactly —
 *  kcal in whole units, protein in tenths of a gram (the lib's rounding).
 *  P10: a stated hunger pattern tilts the shares toward the hungry
 *  part of the day before reconciliation — up to HUNGER_SHARE_SHIFT
 *  of the day, taken from the other slots in proportion to their
 *  shares. The day's totals never move (splitUnits still reconciles
 *  exactly), and a pattern whose slot is not in the day — nights on
 *  a day with no snack slot — changes nothing: there is nowhere
 *  honest to put the weight. */
export function splitTargets(
  targets: NutritionTargets,
  slots: readonly Meal[],
  hungerPattern: HungerPattern | null = null,
): MealSplit[] {
  const shareTotal = slots.reduce((sum, meal) => sum + MEAL_SHARE[meal], 0);
  let shares = slots.map((meal) => MEAL_SHARE[meal] / shareTotal);
  if (hungerPattern !== null && hungerPattern !== "steady") {
    const idx = slots.indexOf(HUNGER_SLOT[hungerPattern]);
    if (idx >= 0) {
      const shift = Math.min(HUNGER_SHARE_SHIFT, 1 - shares[idx]!);
      if (shift > 0) {
        const othersTotal = 1 - shares[idx]!;
        shares = shares.map((s, i) =>
          i === idx ? s + shift : s - (shift * s) / othersTotal,
        );
      }
    }
  }
  const kcals = splitUnits(Math.round(targets.kcal), shares);
  const proteinTenths = splitUnits(Math.round(targets.proteinG * 10), shares);
  return slots.map((meal, i) => ({
    meal,
    kcal: kcals[i]!,
    proteinG: Math.round(proteinTenths[i]!) / 10,
  }));
}

/* --------------------- dietary patterns (ingredient facts) ------------------ */

/**
 * Dietary patterns as first-class filters (P2). A pattern is a set of
 * allowances over ingredient identity — egg, dairy, flesh, fish — read
 * from each reference food's data-layer classification. Patterns are
 * NEVER encoded on veg/non-veg labels: FSSAI legally classes egg as
 * non-vegetarian food, so a label-based filter would exclude the eggs an
 * eggetarian eats (composition research §6). The app's `vegetarian`
 * answer carries its usual Indian meaning, lacto-vegetarian (dairy, no
 * egg); `eggetarian` is lacto-ovo — no flesh of any kind, eggs and dairy
 * allowed. `ovo_vegetarian` (eggs, no dairy) has no app answer today but
 * is a distinct pattern in the literature and is encoded here so the
 * filter table is complete rather than quietly conflated with another.
 */
export type PlanPattern =
  "vegetarian" | "eggetarian" | "vegan" | "ovo_vegetarian" | "pescatarian" | "non_vegetarian";

/** The plan pattern for a stated dietary pattern. `other` and unanswered
 *  map to null — no pattern filter; allergies and dislikes still apply. */
export function planPatternOf(pattern: DietaryPattern | null): PlanPattern | null {
  switch (pattern) {
    case "vegetarian":
      return "vegetarian";
    case "eggetarian":
      return "eggetarian";
    case "vegan":
      return "vegan";
    case "pescatarian":
      return "pescatarian";
    case "omnivore":
      return "non_vegetarian";
    default:
      return null;
  }
}

interface PatternAllowances {
  egg: boolean;
  dairy: boolean;
  flesh: boolean;
  fish: boolean;
}

const PATTERN_ALLOWANCES: Record<PlanPattern, PatternAllowances> = {
  vegetarian: { egg: false, dairy: true, flesh: false, fish: false },
  eggetarian: { egg: true, dairy: true, flesh: false, fish: false },
  vegan: { egg: false, dairy: false, flesh: false, fish: false },
  ovo_vegetarian: { egg: true, dairy: false, flesh: false, fish: false },
  pescatarian: { egg: true, dairy: true, flesh: false, fish: true },
  non_vegetarian: { egg: true, dairy: true, flesh: true, fish: true },
};

/** Whether a classified food's ingredient identity fits a pattern. */
export function patternAllowsClassification(
  pattern: PlanPattern | null,
  classification: FoodClassification,
): boolean {
  if (pattern === null) return true;
  const allow = PATTERN_ALLOWANCES[pattern];
  if (classification.containsEgg && !allow.egg) return false;
  if (classification.containsDairy && !allow.dairy) return false;
  if (classification.isFish) return allow.fish;
  if (classification.isFlesh) return allow.flesh;
  return true;
}

/* ------------------------------- suggestions ------------------------------- */

/**
 * The eligible pool: the user's own foods and the USDA reference set —
 * the two sources whose values Bloom may plan with today. Anything else
 * (an IFCT or OFF food arriving in the pool before its licence lands)
 * is refused here, whatever assembled the pool. The dietary-pattern
 * filter then judges every CLASSIFIED food by its ingredient identity.
 * A person's own foods carry no classification — Bloom does not claim
 * to know what is in a food it did not curate — so they pass the pattern
 * filter; name-matching still drops foods the person said they are
 * allergic to, cannot tolerate, or dislike — their own words against
 * food names, nothing inferred.
 *
 * Exported for the Nutrition tab's swap suggestions (N-UI): a swap is a
 * one-food plan decision, so it is held to exactly this filter — same
 * provenance gate, same pattern judgement, same name-matching.
 *
 * This is the IDENTITY gate — what a food is and whose values it
 * carries. It is deliberately NOT the preparation-basis gate (module
 * 06, spec §4.4): dish composition judges ingredient LINES through
 * this pool, and a recipe's line quantities are cooked by the dish's
 * method, so a dry pulse rightly passes here as an ingredient. The
 * basis gate — a raw/dry-basis record is never SERVED as a portion —
 * is applied where plain foods are presented as portions: the
 * composition pool in `generatePlan` and the candidates in `swapsFor`.
 */
export function eligiblePool(profile: HealthProfile, foods: readonly Food[]): Food[] {
  const terms = [
    ...profile.dietary.allergies,
    ...profile.dietary.intolerances,
    ...profile.dietary.dislikedFoods,
  ]
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3);
  const pattern = planPatternOf(profile.dietary.pattern);
  return foods.filter((food) => {
    if (food.provenance.kind !== "usda" && food.provenance.kind !== "user_entered") return false;
    if (food.classification && !patternAllowsClassification(pattern, food.classification)) {
      return false;
    }
    const name = food.name.toLowerCase();
    return !terms.some((term) => name.includes(term));
  });
}

/* ------------------------------ rotation ---------------------------------- */

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The day's rotation order over the pool: candidates sorted by a hash of
 * (plan day, food id). Deterministic — the same day always composes the
 * same plan, and regenerating a day never re-rolls it — while consecutive
 * days order the pool differently, so grains, protein sources and
 * vegetables rotate across days. The guidelines prescribe rotation
 * across food types as the variety mechanism (ICMR-NIN DGI-2024
 * Guideline 1 and the My Plate variety footnote; composition research
 * §7); the per-day hash is the engine's operationalisation of that
 * principle — a derivation, not a quoted rule.
 */
function rotationOrder(day: string, pool: readonly Food[]): Food[] {
  return pool
    .map((food) => ({ food, key: fnv1a(`${day}:${food.id}`) }))
    .sort((a, b) => a.key - b.key || (a.food.id < b.food.id ? -1 : 1))
    .map((entry) => entry.food);
}

/* ---------------------------- portion caps (hard) --------------------------- */

/**
 * Per-meal portion caps, from the composition research (§5). These are
 * hard constraints: a solver that meets a macro target by breaking one
 * has failed at composition even when the numbers sum. The two cases
 * that forced this rebuild — 235 g of dry lentils and 400 g of one
 * vegetable in a single meal — are exactly what the pulse and vegetable
 * caps exist to refuse.
 *
 * Basis note (module 06, spec §4.4 rule 5): the grain and dry-pulse
 * caps are stated in the DRY quantity, and that is still what they
 * size — the raw quantity of a food in that group. Since the basis
 * pass, the reference set's own dry records are not served at all
 * (their grams are not plate grams), so in practice these caps now
 * bind a person's own dry foods in those layers, and they are the
 * quantities a yield conversion (§4.4 rule 2, when its sources are
 * verified) will size in raw grams before stating the cooked plate
 * quantity. The caps themselves did not move.
 */
const CAP_GRAIN_DRY_G = 90; // dry cereals/millets per meal (brief; BNF dry rice portion 65 g, research flags >120 g)
const CAP_UNCLASSIFIED_BASE_G = 200; // own foods: dry/cooked basis unknown — a middle bound, derivation
const CAP_DRY_PULSES_G = 60; // dry pulses/legumes per meal; normal range 30–50 g, 85 g is the whole ICMR day
const CAP_COOKED_SOY_G = 120; // cooked soy forms per meal (P4) — tofu/tempeh/edamame are eaten
// cooked, at cooked portions: 120 g is a normal serving of tempeh or a bowl of edamame,
// where the 60 g dry-pulse cap (60 g dry ≈ 180 g cooked) silently halved them.
const CAP_EGGS_G = 120; // ≈ 2 eggs (BNF: 2 eggs = 120 g, one protein portion)
const CAP_EGG_PART_G = 60; // egg yolk / egg white alone (P3): the parts are components a cook
// folds into a dish, not standalone portions — 120 g of yolk is ~7 yolks. Whole egg keeps 120 g.
const CAP_DAIRY_PROTEIN_G = 100; // paneer-type dairy in the protein layer (BNF cottage-cheese portion 100 g; research flags >150 g)
const CAP_HARD_CHEESE_G = 30; // hard grating cheeses are condiment-density foods — BNF portions hard cheese at 30 g
const CAP_FLESH_G = 200; // a single meat/fish portion, derivation from BNF protein portions
const CAP_UNCLASSIFIED_PROTEIN_G = 200; // own foods in the protein layer, derivation
const CAP_SINGLE_VEGETABLE_G = 200; // one vegetable in one meal (research §5)
const CAP_MEAL_VEGETABLES_G = 300; // all vegetables in one meal (research §5)
const CAP_FAT_G = 14; // measured visible fat per meal ≈ 1 tbsp (research flags >15 g)
const CAP_FINISHING_DAIRY_G = 250; // milk/curd extra per meal — the tighter of the research serving flags (curd 250 g, milk 300 ml)
const CAP_FRUIT_G = 200; // one fruit portion per sitting, derivation (BNF fruit portion 80 g; ICMR day 100 g)
const CAP_NUTS_G = 30; // nuts/seeds per sitting (BNF portion 20 g; ICMR day 35 g)
/** Portions are sized in 5 g steps and never below this floor. */
const MIN_PORTION_G = 5;

/* Day floors from the ICMR-NIN My Plate (2,000 kcal reference day),
   HELD — not linearly scaled — at higher energy needs, per the policy
   brief's own scaling warning (composition research §1): the extra
   energy and protein of a larger target go to cereals, pulses, dairy,
   eggs and oils, not to ever-larger vegetable piles. */
const FLOOR_VEGETABLES_G = 400;
const FLOOR_FRUIT_G = 100;
/* The My Plate milk-and-curd serving is stated as 300 ml; the floor is
   held in grams because that is how the food data portions milk and
   curd (by weight), so the plan's gram total is judged against the
   gram floor — never grams against millilitres. */
const FLOOR_MILK_CURD_G = 300;
/** Diversity aims (research §1, §7): at least 8 food groups a day is the
 *  ICMR floor; ≥3 distinct protein sources and the ≤40% single-source
 *  share are the research's operationalisation — derivations. */
const AIM_DISTINCT_PROTEIN_SOURCES = 3;
const AIM_FOOD_GROUPS = 8;
const MAX_SINGLE_FOOD_PROTEIN_SHARE = 0.4;

/* Layer energy shares for a main meal — DERIVATIONS (composition
   research §3): no guideline publishes per-meal layer shares; these
   translate the ICMR day shares (cereals 42%E, pulses 14%E, milk 11%E,
   oils 12%E) to a thali whose protein layer is enlarged, because a
   high-protein target (~27%E of the day) cannot be met at the
   general-population protein share. Vegetables are sized by grams, not
   energy — they dominate plate volume, not calories. */
const GRAIN_SHARE_OF_MEAL = 0.35;
const FAT_SHARE_OF_MEAL = 0.1;
/** The protein layer may not crowd out more than this share of a meal's
 *  energy — a guard (derivation) against protein-dense picks eating the
 *  whole plate; items after the first are sized down to respect it. */
const PROTEIN_LAYER_MAX_MEAL_SHARE = 0.6;
const MAX_PROTEIN_ITEMS_PER_MEAL = 4;
/** Within this many grams, a meal's protein counts as landed. */
const PROTEIN_CLOSE_ENOUGH_G = 3;

/** The empty-meal reason (brief v4): the composer records the
 *  structured reason; the meal's stored `note` string is derived
 *  from it through reasons.ts, so the words live in one file. */
const EMPTY_MEAL_REASON: PlanReason = { kind: "meal-empty" };

/** A meal note as the pair the meal carries: the structured reason
 *  and its derived text (null when there is no note). */
function mealNoteFields(reason: PlanReason | null): {
  note: string | null;
  noteReason: PlanReason | null;
} {
  return { note: reason ? reasonDetail(reason) : null, noteReason: reason };
}

/** Set a meal's note from its reason (the trim passes use this when
 *  they empty a meal after composition). */
function setMealNote(meal: PlanMeal, reason: PlanReason | null): void {
  const fields = mealNoteFields(reason);
  meal.note = fields.note;
  meal.noteReason = fields.noteReason;
}

/* --------------------------------- sizing --------------------------------- */

interface SizedPortion {
  grams: number;
  nutrients: Nutrients;
}

/** Round a gram amount to the plan's 5 g steps, never above the cap. */
function roundToStep(grams: number, capG: number): number {
  const stepped = Math.round(grams / 5) * 5;
  return stepped > capG ? Math.floor(capG / 5) * 5 : stepped;
}

/**
 * Size a portion of `food` toward a kcal or protein aim, clamped to the
 * layer's hard cap. Nutrients always come from the lib's own portion
 * math — never re-derived here. Null when no sane portion exists: the
 * food has no density to size by, or the sized portion falls below the
 * 5 g floor.
 */
function sizedPortion(
  food: Food,
  aim: { kcal?: number; proteinG?: number },
  capG: number,
): SizedPortion | null {
  let grams: number | null = null;
  if (aim.proteinG !== undefined && food.per100g.proteinG > 0) {
    grams = (aim.proteinG / food.per100g.proteinG) * 100;
  } else if (aim.kcal !== undefined && food.per100g.kcal > 0) {
    grams = (aim.kcal / food.per100g.kcal) * 100;
  }
  if (grams === null || !Number.isFinite(grams)) return null;
  grams = roundToStep(grams, capG);
  if (grams < MIN_PORTION_G) return null;
  return { grams, nutrients: nutrientsForGrams(food.per100g, grams) };
}

/* ------------------------------ composition ------------------------------- */

const groupOf = (food: Food): FoodGroup | null => food.classification?.group ?? null;

/** Milk/curd for the day floor and the finishing layer: the dairy group's
 *  fluid and fermented foods. The protein-bearing dairy foods (Greek
 *  yogurt, cottage cheese, hard cheeses) are protein-layer foods; what
 *  remains in this set is milk and plain curd/yogurt — the foods the
 *  ICMR 300 ml floor is stated in. */
const isMilkOrCurd = (food: Food): boolean =>
  groupOf(food) === "dairy" && food.per100g.proteinG < 5;

/** The reference milk-and-curd foods, pinned by id (the
 *  COOKED_SOY_FORM_IDS pattern): the dairy group's milks and
 *  curd/yogurts. No nutrient threshold separates them honestly —
 *  Greek yogurt (hung curd) carries 10.3 g of protein per 100 g,
 *  more than cottage cheese, yet it IS curd; the cheeses and
 *  cottage cheese are protein foods. A census test pins this set
 *  against the reference data so a data refresh cannot drift it. */
export const MILK_CURD_FOOD_IDS: ReadonlySet<string> = new Set([
  "usda-322559", // Milk, nonfat, fluid
  "usda-322892", // Milk, whole, 3.25% milkfat
  "usda-2259793", // Yogurt, plain, whole milk
  "usda-330137", // Yogurt, Greek, plain, nonfat (hung curd)
]);

/** Whether a SERVED portion counts toward the day's milk-and-curd
 *  floor tally (P12 fix). Composition keeps using isMilkOrCurd —
 *  Greek yogurt is a protein-layer food when the composer places
 *  it — but the TALLY measures what the person actually ate, and a
 *  bowl of curd is curd however it was composed: before this fix a
 *  day serving the Enriched Fruit and Curd Bowl (125 g of Greek
 *  yogurt a serving) tallied 0 g and the note said so, falsely.
 *  Own foods keep the protein heuristic — there are no ids to pin. */
export const countsTowardMilkCurdFloor = (food: Food): boolean =>
  MILK_CURD_FOOD_IDS.has(food.id) || isMilkOrCurd(food);

/** Shared composition state for one day: the pool in rotation order, the
 *  foods already suggested (variety prefers the unused), and the running
 *  day-floor totals the later meals can react to. */
interface ComposeContext {
  ordered: readonly Food[];
  pattern: PlanPattern | null;
  used: Set<string>;
  vegG: number;
  fruitG: number;
  milkCurdG: number;
  /** Log-adaptive bias (P6): the person's recent logged days averaged
   *  well under their protein target, so protein-bearing choices are
   *  ranked by protein density first. Absent/false = the unbiased
   *  composer, exactly as before P6. */
  proteinFirst?: boolean;
  /** P12: the day's protein guide is dilute (under ~0.055 g per
   *  kcal — the general-health and maintain guides), so the plate's
   *  incidental protein (vegetables, the dairy extra, breakfast
   *  nuts) is a large share of it; the protein layer's aim counts
   *  those incidentals instead of overshooting the guide by them.
   *  Absent/false = the layer aims at the bare split, as before. */
  lowProteinDensity?: boolean;
  /** The craving kinds the person stated (P10, spec §10): the snack
   *  composition reads them — a stated sweet craving makes the
   *  snack's flexible item prefer fruit. Empty = nothing stated. */
  cravingKinds: readonly CravingKind[];
}

function recordSuggestion(
  ctx: ComposeContext,
  food: Food,
  portion: SizedPortion,
  layer: SuggestionLayer,
): PlanSuggestion {
  ctx.used.add(food.id);
  if (groupOf(food) === "vegetables") ctx.vegG += portion.grams;
  if (groupOf(food) === "fruits") ctx.fruitG += portion.grams;
  if (countsTowardMilkCurdFloor(food)) ctx.milkCurdG += portion.grams;
  return {
    foodId: food.id,
    name: food.name,
    grams: portion.grams,
    nutrients: portion.nutrients,
    provenance: food.provenance,
    layer,
  };
}

/** First food in rotation order matching `pred`, preferring one not yet
 *  suggested today; when every match is used, the first match (a repeated
 *  food beats an empty layer when data exists — the P1 principle).
 *  Foods already in the current meal are always excluded. */
function pickFood(
  ctx: ComposeContext,
  inMeal: ReadonlySet<string>,
  pred: (food: Food) => boolean,
): Food | null {
  let fallback: Food | null = null;
  for (const food of ctx.ordered) {
    if (inMeal.has(food.id) || !pred(food)) continue;
    if (!ctx.used.has(food.id)) return food;
    fallback ??= food;
  }
  return fallback;
}

/* ------------------------------ protein kinds ------------------------------ */

type ProteinKind = "eggs" | "pulses" | "dairy" | "flesh" | "own";

const PROTEIN_CAP_G: Record<ProteinKind, number> = {
  eggs: CAP_EGGS_G,
  pulses: CAP_DRY_PULSES_G,
  dairy: CAP_DAIRY_PROTEIN_G,
  flesh: CAP_FLESH_G,
  own: CAP_UNCLASSIFIED_PROTEIN_G,
};

/** An egg part — yolk or white alone — as opposed to the whole egg. The
 *  reference set's eggs group holds exactly three foods (whole, white,
 *  yolk) with the part named in the pinned USDA description; a food in
 *  the group whose name does not say "whole" is a part. Parts are
 *  capped tighter (P3) and lose rotation ties to the whole egg: a plan
 *  suggests eggs a person cracks, not bowls of separated yolks. */
function isEggPart(food: Food): boolean {
  return groupOf(food) === "eggs" && !/whole/i.test(food.name);
}

/** A seasoning-class vegetable (P3): in this reference set, the hot
 *  chillies — "Peppers, hot chili, …" — whose pinned USDA names carry
 *  their heat in the name. They belong to the vegetables group in the
 *  data (a cook buys them there; the dish library prices their tadka
 *  lines there), but a plan's vegetables layer serves portions, and a
 *  chilli is never a portion. The name test is exact for the pinned
 *  set: the sweet peppers ("Peppers, sweet, …") do not match and stay
 *  eligible, as they should — they are eaten by the piece. */
function isSeasoningClass(food: Food): boolean {
  return groupOf(food) === "vegetables" && /hot chili|chilli/i.test(food.name);
}

/** The cooked soy forms in the reference set (P4): the foods the USDA
 *  set carries as ready-to-eat soy — firm tofu (FDC 172448), tempeh
 *  (FDC 174272) and edamame (FDC 168410), keyed by their pinned
 *  reference ids (`usda-<fdcId>`). They sit in the pulses_legumes
 *  group, but unlike the group's dry seeds they are eaten cooked, so
 *  the dry-pulse cap misapplies to them (60 g of tempeh is half a
 *  serving). Keyed on id, not name: the ids are the stable FDC
 *  identity the generator pins. If a further cooked soy form joins
 *  the set, it joins this list with its FDC id — dry soybeans
 *  (FDC 174270) deliberately do not: they are a dry seed and keep the
 *  dry cap. */
export const COOKED_SOY_FORM_IDS: ReadonlySet<string> = new Set([
  "usda-172448", // Tofu, firm — FDC 172448
  "usda-174272", // Tempeh — FDC 174272
  "usda-168410", // Edamame, frozen — FDC 168410
]);

/** A protein powder (P11): a food whose whole purpose is protein —
 *  in the reference set's classification it sits in the "other"
 *  group, is neither flesh nor fish, and carries at least 40 g of
 *  protein per 100 g. The threshold is a census fact about the
 *  pinned set, not a guess: exactly two records meet it — the PW-1
 *  whey isolate (58.14 g/100 g) and soy powder (55.56 g/100 g) —
 *  and the next-densest "other" food sits at 26 g/100 g. Powders
 *  are supplement foods: they never carry a meal's protein layer
 *  and never compose a plate, but a top-up — a simple food that
 *  closes a day's gap — is exactly what they are for. */
export function isProteinPowder(food: Food): boolean {
  const cls = food.classification;
  if (!cls || cls.group !== "other" || cls.isFlesh || cls.isFish) return false;
  return food.per100g.proteinG >= 40;
}

/** The top-up cap for a protein powder, in grams: one scoop of the
 *  soy record (its own listed serving is 1 scoop = 45 g) and about
 *  a scoop and a half of the whey record (3 scoops = 86 g). A
 *  top-up is sized toward the day's gap inside this cap, exactly
 *  as every other top-up is sized inside its own. */
const CAP_PROTEIN_POWDER_G = 45;

/** The protein-layer cap for one food. Dairy splits by the food's own
 *  energy density: at ≥350 kcal per 100 g a dairy food is a hard grating
 *  cheese (in this set, parmesan), portioned by BNF at 30 g — not a
 *  paneer-type food, whose 100 g portion the wider cap comes from. The
 *  density threshold is a derivation from the food's stated values. */
function proteinCapG(food: Food, kind: ProteinKind): number {
  if (kind === "dairy" && food.per100g.kcal >= 350) return CAP_HARD_CHEESE_G;
  if (kind === "eggs" && isEggPart(food)) return CAP_EGG_PART_G;
  if (kind === "pulses" && COOKED_SOY_FORM_IDS.has(food.id)) return CAP_COOKED_SOY_G;
  return PROTEIN_CAP_G[kind];
}

/** The protein-layer kind of a food, or null when it cannot carry a
 *  meal's protein layer. Classified foods qualify by group; an own food
 *  qualifies on its own stated values (≥5 g protein per 100 g — the P1
 *  protein-source threshold, a fact about the food, not a guess at its
 *  identity). */
function proteinKindOf(food: Food): ProteinKind | null {
  const group = groupOf(food);
  if (group === "eggs") return "eggs";
  if (group === "pulses_legumes") return "pulses";
  if (group === "dairy") return food.per100g.proteinG >= 5 ? "dairy" : null;
  if (group === "other") return food.classification?.isFlesh ? "flesh" : null;
  if (group !== null) return null;
  return food.per100g.proteinG >= 5 ? "own" : null;
}

/** Grain-base eligibility: classified cereals, or an own food whose own
 *  stated values are predominantly carbohydrate (P1's meal-base rule). */
function isGrainBase(food: Food): boolean {
  const group = groupOf(food);
  if (group !== null) return group === "cereals_grains";
  return food.per100g.carbsG >= 10;
}

/* ------------------------------- main meals ------------------------------- */

interface MainMealComposition {
  suggestions: PlanSuggestion[];
  /** Which expected layers produced nothing, in plain names. */
  missingLayers: string[];
}

function composeMainMeal(
  ctx: ComposeContext,
  split: MealSplit,
  opts: { vegTargetG: number; fruitAtBreakfast: boolean; isBreakfast: boolean },
): MainMealComposition {
  const suggestions: PlanSuggestion[] = [];
  const inMeal = new Set<string>();
  const missing: string[] = [];
  let kcalTally = 0;
  const add = (food: Food, portion: SizedPortion, layer: SuggestionLayer) => {
    suggestions.push(recordSuggestion(ctx, food, portion, layer));
    inMeal.add(food.id);
    kcalTally += portion.nutrients.kcal;
  };

  /* (a) Grain base — ~35% of the meal's energy (derivation, §3). */
  const grain = pickFood(ctx, inMeal, isGrainBase);
  const grainPortion =
    grain &&
    sizedPortion(
      grain,
      { kcal: GRAIN_SHARE_OF_MEAL * split.kcal },
      groupOf(grain) === "cereals_grains" ? CAP_GRAIN_DRY_G : CAP_UNCLASSIFIED_BASE_G,
    );
  if (grain && grainPortion) add(grain, grainPortion, "base");
  else missing.push("a grain base");

  /* (b) Protein layer — up to four sources, distinct kinds first, each
     sized toward the protein still owed and clamped to its group cap.
     Items after the first are also sized down so the layer stays within
     its share of the meal's energy. The meal's protein split is the
     aim; the caps are the law. Where the split runs above what capped
     whole foods can carry (a 220 g day puts 55 g+ into a meal, above
     the classic 20–40 g serving band — research §4), the meal lands
     under its split honestly rather than breaking a cap to reach it. */
  let proteinLeft = split.proteinG;
  if (ctx.lowProteinDensity) {
    /* P12: count the plate's incidental protein in the aim. The
       vegetables carry ~1.8 g per 100 g toward their gram target;
       the dairy extra pours toward the day's remaining floor gap
       at ~3.5 g per 100 g; breakfast's nuts carry ~3 g. On a
       dilute guide these incidentals are a fifth of the day's
       protein — sized against the bare split, the layer overshoots
       the guide by exactly them (the 1000-run census: overshoot
       worst at the smallest densities). The day's closing passes
       correct the estimate as they always have; the aim never
       drops below a real first portion. */
    const dairyAllowedHere = ctx.pattern === null || PATTERN_ALLOWANCES[ctx.pattern].dairy;
    const vegProtein = opts.vegTargetG * 0.018;
    const dairyProtein = dairyAllowedHere
      ? Math.min(CAP_FINISHING_DAIRY_G, Math.max(0, FLOOR_MILK_CURD_G - ctx.milkCurdG)) * 0.035
      : 0;
    const nutsProtein = opts.isBreakfast ? 3 : 0;
    proteinLeft = Math.max(8, split.proteinG - vegProtein - dairyProtein - nutsProtein);
  }
  let proteinKcal = 0;
  const kindsUsed = new Set<ProteinKind>();
  for (
    let slot = 0;
    slot < MAX_PROTEIN_ITEMS_PER_MEAL && proteinLeft > PROTEIN_CLOSE_ENOUGH_G;
    slot++
  ) {
    /* Rank candidates: unused-today before used, a new kind before a
       repeat kind — rotation order breaks the remaining ties. An egg
       part also loses to the whole egg at equal standing (P3): parts
       are components, and the whole egg is the portion a person eats. */
    let best: { food: Food; kind: ProteinKind; score: number } | null = null;
    for (const food of ctx.ordered) {
      if (inMeal.has(food.id)) continue;
      const kind = proteinKindOf(food);
      if (kind === null) continue;
      const score =
        (ctx.used.has(food.id) ? 4 : 0) + (kindsUsed.has(kind) ? 2 : 0) + (isEggPart(food) ? 1 : 0);
      if (!best || score < best.score) best = { food, kind, score };
    }
    if (!best) break;
    let portion = sizedPortion(
      best.food,
      { proteinG: proteinLeft },
      proteinCapG(best.food, best.kind),
    );
    if (
      portion &&
      slot > 0 &&
      proteinKcal + portion.nutrients.kcal > PROTEIN_LAYER_MAX_MEAL_SHARE * split.kcal
    ) {
      portion = sizedPortion(
        best.food,
        { kcal: PROTEIN_LAYER_MAX_MEAL_SHARE * split.kcal - proteinKcal },
        proteinCapG(best.food, best.kind),
      );
    }
    /* A later protein item sized down to a garnish is not a source —
       the layer stops instead of suggesting a token portion. */
    if (portion && slot > 0 && portion.grams < 15) portion = null;
    if (!portion) break;
    add(best.food, portion, "protein");
    kindsUsed.add(best.kind);
    proteinLeft -= portion.nutrients.proteinG;
    proteinKcal += portion.nutrients.kcal;
  }
  if (!suggestions.some((s) => s.layer === "protein")) missing.push("a protein food");

  /* (c) Vegetables — at least two distinct when the pool allows, sized
     by grams toward the day's 400 g floor spread across the main meals:
     volume first, energy second (§3). Seasoning-class vegetables (the
     hot chillies) are excluded: they sit in the vegetables group in
     the reference data — a cook buys them there, and the dish library
     prices them there — but nobody eats 70 g of fresh chilli as a
     vegetable portion (P3). Sweet peppers are eaten in portions and
     stay eligible. */
  let vegTotal = 0;
  for (let i = 0; i < 2; i++) {
    const veg = pickFood(ctx, inMeal, (f) => groupOf(f) === "vegetables" && !isSeasoningClass(f));
    if (!veg) break;
    const room = Math.min(CAP_SINGLE_VEGETABLE_G, CAP_MEAL_VEGETABLES_G - vegTotal);
    const target = i === 0 ? Math.ceil(opts.vegTargetG / 2) : opts.vegTargetG - vegTotal;
    const grams = roundToStep(Math.min(target, room), room);
    if (grams < MIN_PORTION_G) break;
    add(veg, { grams, nutrients: nutrientsForGrams(veg.per100g, grams) }, "vegetables");
    vegTotal += grams;
  }
  if (vegTotal === 0) missing.push("vegetables");

  /* (d) Measured fat — ~10% of the meal's energy (derivation, §3),
     inside the ~1 tbsp cap. Butter and ghee live in this group too;
     the pattern filter has already judged them. */
  const fat = pickFood(ctx, inMeal, (f) => groupOf(f) === "fats_oils");
  const fatPortion = fat && sizedPortion(fat, { kcal: FAT_SHARE_OF_MEAL * split.kcal }, CAP_FAT_G);
  if (fat && fatPortion) add(fat, fatPortion, "finishing");
  else missing.push("a cooking fat");

  /* (e) Finishing — the day's floor-carrying extras, lightest first so a
     heavy extra cannot crowd the others out of the meal's tolerance:
     at breakfast, fruit (when the day has no snack slot to carry the
     fruit floor) and a small nuts/seeds item; then, at every main meal,
     the dairy extra when the pattern allows it — milk or curd sized to
     the meal's remaining energy, and sized up toward the 300 ml ICMR
     floor while the day is short of it, provided the meal is not
     already far over its split (both are aims; the floor is the one a
     guideline numbers). When the pattern excludes dairy the dairy layer
     is empty BY PATTERN, which is not a gap and is never noted as one.
     Research §3 places fruit and nuts/seeds at breakfast/snacks. */
  const withinTolerance = () => kcalTally <= 1.25 * split.kcal;
  if (opts.isBreakfast) {
    if (opts.fruitAtBreakfast) {
      const fruit = pickFood(ctx, inMeal, (f) => groupOf(f) === "fruits");
      if (fruit) {
        const remaining = split.kcal - kcalTally;
        let portion = remaining > 0 ? sizedPortion(fruit, { kcal: remaining }, CAP_FRUIT_G) : null;
        if (ctx.fruitG < FLOOR_FRUIT_G && withinTolerance()) {
          const want = Math.min(CAP_FRUIT_G, FLOOR_FRUIT_G - ctx.fruitG);
          if (!portion || portion.grams < want) {
            const grams = roundToStep(want, CAP_FRUIT_G);
            if (grams >= 50)
              portion = { grams, nutrients: nutrientsForGrams(fruit.per100g, grams) };
          }
        }
        if (portion && portion.grams >= 50) add(fruit, portion, "finishing");
      }
    }
    const nuts = pickFood(ctx, inMeal, (f) => groupOf(f) === "nuts_seeds");
    if (nuts) {
      const remaining = split.kcal - kcalTally;
      let portion =
        remaining >= 60 ? sizedPortion(nuts, { kcal: Math.min(remaining, 120) }, CAP_NUTS_G) : null;
      if (!portion && withinTolerance()) {
        portion = { grams: 15, nutrients: nutrientsForGrams(nuts.per100g, 15) };
      }
      if (portion) add(nuts, portion, "finishing");
    }
  }
  const dairyAllowed = ctx.pattern === null || PATTERN_ALLOWANCES[ctx.pattern].dairy;
  if (dairyAllowed) {
    const dairy = pickFood(ctx, inMeal, isMilkOrCurd);
    if (!dairy) {
      missing.push("a dairy extra");
    } else {
      const remaining = split.kcal - kcalTally;
      /* P12: the extra is sized toward the DAY's floor gap, not the
         meal's whole remaining energy. Sized by remaining energy,
         each meal independently poured up to 250 g — 750 g of milk
         across a day whose floor is 300 g, carrying ~27 g of
         protein the day's guide never asked for (the no-cook
         census: protein overshoot worst exactly where the protein
         guide is smallest). While the floor is unmet the cap is
         the gap itself (never under a 100 g glass); once the floor
         is met, a modest glass is all an extra is. */
      const dairyCapG =
        ctx.milkCurdG >= FLOOR_MILK_CURD_G
          ? 100
          : Math.min(CAP_FINISHING_DAIRY_G, Math.max(100, FLOOR_MILK_CURD_G - ctx.milkCurdG));
      let portion = remaining >= 60 ? sizedPortion(dairy, { kcal: remaining }, dairyCapG) : null;
      if (ctx.milkCurdG < FLOOR_MILK_CURD_G && withinTolerance()) {
        const want = Math.min(CAP_FINISHING_DAIRY_G, FLOOR_MILK_CURD_G - ctx.milkCurdG);
        if (!portion || portion.grams < want) {
          const grams = roundToStep(want, CAP_FINISHING_DAIRY_G);
          if (grams >= 50) portion = { grams, nutrients: nutrientsForGrams(dairy.per100g, grams) };
        }
      }
      if (portion && portion.grams >= 50) add(dairy, portion, "finishing");
    }
  }

  return { suggestions, missingLayers: missing };
}

/* --------------------------------- snacks --------------------------------- */

function snackCapG(food: Food): number {
  const group = groupOf(food);
  if (group === "fruits") return CAP_FRUIT_G;
  if (group === "nuts_seeds") return CAP_NUTS_G;
  if (group === "eggs") return isEggPart(food) ? CAP_EGG_PART_G : CAP_EGGS_G;
  if (group === "dairy")
    return food.per100g.proteinG >= 5 ? CAP_DAIRY_PROTEIN_G : CAP_FINISHING_DAIRY_G;
  return CAP_UNCLASSIFIED_PROTEIN_G;
}

const isSnackFood = (food: Food): boolean => {
  const group = groupOf(food);
  return (
    group === "fruits" ||
    group === "nuts_seeds" ||
    group === "dairy" ||
    group === "eggs" ||
    group === null
  );
};

/** A snack is one or two items — fruit, nuts, dairy or egg, per pattern
 *  (the pattern filter has already run). The first item leans protein
 *  when the snack's split carries real protein; the second prefers
 *  fruit while the day is still short of the fruit floor. */
function composeSnack(ctx: ComposeContext, split: MealSplit): PlanSuggestion[] {
  const suggestions: PlanSuggestion[] = [];
  const inMeal = new Set<string>();
  let kcalTally = 0;
  const add = (food: Food, portion: SizedPortion) => {
    suggestions.push(recordSuggestion(ctx, food, portion, "snack"));
    inMeal.add(food.id);
    kcalTally += portion.nutrients.kcal;
  };

  const first =
    (split.proteinG >= 10 &&
      pickFood(ctx, inMeal, (f) => isSnackFood(f) && f.per100g.proteinG >= 5)) ||
    pickFood(ctx, inMeal, isSnackFood);
  const firstPortion = first && sizedPortion(first, { kcal: 0.6 * split.kcal }, snackCapG(first));
  if (first && firstPortion) add(first, firstPortion);

  const remaining = split.kcal - kcalTally;
  if (remaining >= 40) {
    /* P10: a stated sweet craving keeps the fruit preference alive
     *  even once the day's fruit floor is met — fruit is the snack
     *  pool's sweet whole food, so the craving is answered with a
     *  real food, not a confection. (Salty and fried cravings have
     *  no honest signal in the food data — no taste or preparation
     *  tags exist — so they are not shaped here rather than faked.) */
    const second =
      (ctx.fruitG < FLOOR_FRUIT_G && pickFood(ctx, inMeal, (f) => groupOf(f) === "fruits")) ||
      (ctx.cravingKinds.includes("sweet") &&
        pickFood(ctx, inMeal, (f) => groupOf(f) === "fruits")) ||
      pickFood(ctx, inMeal, isSnackFood);
    const portion = second && sizedPortion(second, { kcal: remaining }, snackCapG(second));
    if (second && portion) add(second, portion);
  }
  return suggestions;
}

/* --------------------------- day-level honesty ----------------------------- */

/**
 * No single food may supply more than ~40% of the day's protein
 * (research §7 operationalisation — a derivation). Rotation and the
 * portion caps make this rare; when a thin pool forces one food to
 * dominate, later portions of it are trimmed (never below a real
 * portion, and an item trimmed to nothing is removed) so the plan's
 * protein is genuinely spread.
 */
function applyProteinDominanceCap(
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  targetProteinG: number,
): void {
  const cap = MAX_SINGLE_FOOD_PROTEIN_SHARE * targetProteinG;
  const totals = new Map<string, number>();
  for (const meal of meals) {
    for (const s of meal.suggestions) {
      totals.set(s.foodId, (totals.get(s.foodId) ?? 0) + s.nutrients.proteinG);
    }
  }
  for (const [foodId, protein] of totals) {
    if (protein <= cap) continue;
    const food = byId.get(foodId);
    if (!food || food.per100g.proteinG <= 0) continue;
    let excess = protein - cap;
    for (let i = meals.length - 1; i >= 0 && excess > 0; i--) {
      const meal = meals[i]!;
      const idx = meal.suggestions.findIndex((s) => s.foodId === foodId);
      if (idx < 0) continue;
      const suggestion = meal.suggestions[idx]!;
      const cutG = Math.ceil(((excess / food.per100g.proteinG) * 100) / 5) * 5;
      const newGrams = suggestion.grams - cutG;
      /* The snack's last item is trimmed to the floor, never removed
         (P12) — the same never-empty-the-snack rule as the energy
         trim. */
      const keepLastSnackItem = meal.meal === "snack" && meal.suggestions.length === 1;
      if (newGrams < 10 && !keepLastSnackItem) {
        excess -= suggestion.nutrients.proteinG;
        meal.suggestions.splice(idx, 1);
        if (meal.suggestions.length === 0 && meal.dishes.length === 0) {
          setMealNote(meal, EMPTY_MEAL_REASON);
        }
      } else {
        const keptGrams = Math.max(10, newGrams);
        const nutrients = nutrientsForGrams(food.per100g, keptGrams);
        excess -= suggestion.nutrients.proteinG - nutrients.proteinG;
        meal.suggestions[idx] = { ...suggestion, grams: keptGrams, nutrients };
      }
    }
  }
}

/**
 * Protein-overshoot trim (P11): the mirror of the P3 closing pass.
 * Closing only ever pushes protein UP, and the layered composer
 * sizes each meal's protein layer against its split with capped,
 * minimum-viable portions — on a small-protein day the floors and
 * minimums add up past the guide (the 500-run matrix measured food-
 * composed days at up to +56% protein, and the overshoot was not
 * even named in the notes). This pass works an over-band day back
 * toward the band's ceiling (110% of the guide): the largest
 * protein-layer or top-up portion gives up grams in 5 g steps,
 * never below a real 15 g portion, and never at the cost of the
 * day's energy band — a cut stops where the energy floor begins.
 * Dish scales are not touched (the day guard owns them); what this
 * pass cannot land, the notes now name with the true figure.
 */
function trimProteinOvershoot(
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  targets: NutritionTargets,
): void {
  const ceiling = DAY_PROTEIN_MAX * targets.proteinG;
  if (dayProteinOf(meals) <= ceiling) return;
  const kcalFloor = (1 - ENERGY_NOTE_BAND) * targets.kcal;
  for (let round = 0; round < 40; round++) {
    const over = dayProteinOf(meals) - ceiling;
    if (over <= 0) return;
    let best: { meal: PlanMeal; idx: number; s: PlanSuggestion } | null = null;
    for (const meal of meals) {
      meal.suggestions.forEach((s, idx) => {
        if (s.layer !== "protein" && s.layer !== "topup") return;
        if (s.grams <= 20) return;
        if (!best || s.nutrients.proteinG > best.s.nutrients.proteinG) {
          best = { meal, idx, s };
        }
      });
    }
    if (!best) break;
    const chosen: { meal: PlanMeal; idx: number; s: PlanSuggestion } = best;
    const food = byId.get(chosen.s.foodId);
    if (!food || food.per100g.proteinG <= 0) break;
    const wantG = Math.ceil(((over / food.per100g.proteinG) * 100) / 5) * 5;
    let cutG = Math.min(wantG, chosen.s.grams - 15);
    const kcalPerGram = food.per100g.kcal / 100;
    if (kcalPerGram > 0) {
      const kcalRoom = dayKcalOf(meals) - kcalFloor;
      if (kcalRoom <= 0) break;
      cutG = Math.min(cutG, Math.floor(kcalRoom / kcalPerGram / 5) * 5);
    }
    if (cutG < 5) break;
    setPortion(chosen.meal, chosen.idx, food, chosen.s.grams - cutG);
  }

  /* Swap-down (P12): portion cuts stall at the energy floor — the
     day is energy-short AND protein-long, so nothing more can be
     cut without breaking the energy band. What remains is
     substitution: a top-up carrying protein the day does not need
     (nuts and seeds bought for energy carry 0.03–0.06 g per kcal)
     is exchanged for an equal-energy simple food carrying less —
     coconut, at ~0.009 g per kcal, is the pool's leanest. Only
     top-up items swap: they are completing foods by definition,
     and a composed layer is never unmade. The exchange holds the
     day's energy within a few kcal, so the energy band the cuts
     were protecting is not spent by the rescue. */
  for (let round = 0; round < 6; round++) {
    if (dayProteinOf(meals) <= ceiling) return;
    let victimMeal: PlanMeal | null = null;
    let victimIdx = -1;
    let victimProtein = 0;
    for (const meal of meals) {
      for (let idx = 0; idx < meal.suggestions.length; idx++) {
        const s = meal.suggestions[idx]!;
        if (s.layer !== "topup") continue;
        if (s.nutrients.proteinG > victimProtein) {
          victimProtein = s.nutrients.proteinG;
          victimMeal = meal;
          victimIdx = idx;
        }
      }
    }
    if (victimMeal === null || victimIdx < 0) return;
    const victim = victimMeal.suggestions[victimIdx]!;
    if (victim.nutrients.kcal <= 0) return;
    const victimDensity = victim.nutrients.proteinG / victim.nutrients.kcal;
    const inMeal = new Set(victimMeal.suggestions.map((s) => s.foodId));
    const dayUsed = new Set(meals.flatMap((m) => m.suggestions.map((s) => s.foodId)));
    const candidates = [...byId.values()]
      .filter(
        (f) =>
          !inMeal.has(f.id) &&
          !isRawBasisFood(f) &&
          (isMilkOrCurd(f) || groupOf(f) === "nuts_seeds") &&
          f.per100g.kcal > 0 &&
          f.per100g.proteinG / f.per100g.kcal < victimDensity - 0.01,
      )
      .sort(
        (a, b) =>
          Number(dayUsed.has(a.id)) - Number(dayUsed.has(b.id)) ||
          a.per100g.proteinG / a.per100g.kcal - b.per100g.proteinG / b.per100g.kcal,
      );
    let swapped = false;
    for (const food of candidates) {
      const cap = isMilkOrCurd(food) ? CAP_FINISHING_DAIRY_G : CAP_NUTS_G;
      const portion = sizedPortion(food, { kcal: victim.nutrients.kcal }, cap);
      if (!portion) continue;
      if (portion.nutrients.proteinG > victim.nutrients.proteinG - 3) continue;
      if (Math.abs(portion.nutrients.kcal - victim.nutrients.kcal) > 0.15 * victim.nutrients.kcal) {
        continue;
      }
      victimMeal.suggestions[victimIdx] = {
        foodId: food.id,
        name: food.name,
        grams: portion.grams,
        nutrients: portion.nutrients,
        provenance: food.provenance,
        layer: "topup",
      };
      swapped = true;
      break;
    }
    if (!swapped) return;
  }
}

/* --------------------- P3 maturity passes (post-compose) -------------------- */

/** A main meal a person can actually assemble: at most this many
 *  suggestions. The P2 composer could stack eleven (base + four protein
 *  items + two vegetables + fat + fruit + nuts + dairy at breakfast) —
 *  a spreadsheet, not a plate. Snacks keep their own 1–2 item shape. */
const MAX_MAIN_MEAL_ITEMS = 8;
/** Protein closing (P3): below this share of the target the gap is
 *  worth closing actively; the notes name whatever remains below it. */
const PROTEIN_CLOSE_FRACTION = 0.95;
/** Energy reconciliation (P3): composition may land within ±3% of the
 *  target untouched; outside that, the trim/add-back passes work it
 *  back toward the target. The notes judge the result at ±5%. */
const ENERGY_TRIM_TRIGGER = 1.03;
const ENERGY_ADD_TRIGGER = 0.97;
const ENERGY_NOTE_BAND = 0.05;

const dayKcalOf = (meals: readonly PlanMeal[]): number =>
  meals.reduce(
    (sum, m) =>
      sum +
      m.suggestions.reduce((a, s) => a + s.nutrients.kcal, 0) +
      m.dishes.reduce((a, d) => a + d.nutrients.kcal, 0),
    0,
  );

const dayProteinOf = (meals: readonly PlanMeal[]): number =>
  meals.reduce(
    (sum, m) =>
      sum +
      m.suggestions.reduce((a, s) => a + s.nutrients.proteinG, 0) +
      m.dishes.reduce((a, d) => a + d.nutrients.proteinG, 0),
    0,
  );

/** The day's ICMR floor totals as the meals NOW stand — recomputed from
 *  the suggestions themselves, so post-composition passes (and the
 *  notes that judge them) always speak about the plan's real numbers,
 *  never the composer's running tally. P5: a plan dish contributes its
 *  ingredient lines' grams (per serving, at the servings the plan
 *  serves) under each line food's group — a vegetable curry's
 *  vegetables are vegetables, wherever they were composed. */
export function floorTotalsOf(
  meals: readonly PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): { vegG: number; fruitG: number; milkCurdG: number } {
  let vegG = 0;
  let fruitG = 0;
  let milkCurdG = 0;
  const addFood = (food: Food, grams: number) => {
    if (groupOf(food) === "vegetables") vegG += grams;
    if (groupOf(food) === "fruits") fruitG += grams;
    if (countsTowardMilkCurdFloor(food)) milkCurdG += grams;
  };
  for (const meal of meals) {
    for (const s of meal.suggestions) {
      const food = byId.get(s.foodId);
      if (food) addFood(food, s.grams);
    }
    for (const planDish of meal.dishes) {
      const dish = dishById.get(planDish.dishId);
      if (!dish) continue;
      for (const line of dish.lines) {
        const food = byId.get(line.foodId);
        if (food) addFood(food, (line.grams / dish.servings) * planDish.servings);
      }
    }
  }
  return { vegG, fruitG, milkCurdG };
}

/** Replace a suggestion's portion, recomputing its nutrients through
 *  the lib's portion math — the only way grams ever change (P3). */
function setPortion(meal: PlanMeal, idx: number, food: Food, grams: number): void {
  const suggestion = meal.suggestions[idx]!;
  meal.suggestions[idx] = {
    ...suggestion,
    grams,
    nutrients: nutrientsForGrams(food.per100g, grams),
  };
}

const floor5 = (grams: number): number => Math.floor(grams / 5) * 5;
const ceil5 = (grams: number): number => Math.ceil(grams / 5) * 5;

/**
 * The plate cap (P3): trim each main meal to at most eight suggestions.
 * What goes, in order: the nuts extra (the one finishing item no floor
 * or layer needs); a garnish protein item (≤8 g of protein — a token,
 * not a source); a dairy or fruit extra the day's floor can spare;
 * the weakest remaining protein item; and only then a floor-carrying
 * extra. The base, the vegetables, the measured fat and the protein
 * anchor (the meal's strongest protein item) are never dropped, and a
 * meal is never emptied.
 */
function applyItemCap(
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): void {
  for (const meal of meals) {
    if (meal.meal === "snack") continue;
    while (meal.suggestions.length > MAX_MAIN_MEAL_ITEMS) {
      const victim = itemCapVictim(meal, meals, byId, dishById);
      if (victim < 0) break;
      meal.suggestions.splice(victim, 1);
    }
    if (meal.suggestions.length === 0 && meal.dishes.length === 0) {
      setMealNote(meal, EMPTY_MEAL_REASON);
    }
  }
}

function itemCapVictim(
  meal: PlanMeal,
  meals: readonly PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): number {
  const items = meal.suggestions;
  const foodAt = (i: number) => byId.get(items[i]!.foodId);
  let anchor = -1;
  let anchorProtein = -1;
  items.forEach((s, i) => {
    if (s.layer === "protein" && s.nutrients.proteinG > anchorProtein) {
      anchor = i;
      anchorProtein = s.nutrients.proteinG;
    }
  });
  const droppable = (i: number): boolean => {
    const layer = items[i]!.layer;
    if (layer === "base" || layer === "vegetables") return false;
    if (groupOf(foodAt(i)!) === "fats_oils") return false;
    return i !== anchor;
  };
  const totals = floorTotalsOf(meals, byId, dishById);
  /* 1. The nuts/seeds extra — no floor, no layer depends on it. */
  for (let i = 0; i < items.length; i++) {
    if (droppable(i) && groupOf(foodAt(i)!) === "nuts_seeds") return i;
  }
  /* 2. A garnish protein item — present, but not a source. */
  let garnish = -1;
  let garnishProtein = Infinity;
  items.forEach((s, i) => {
    if (
      droppable(i) &&
      s.layer === "protein" &&
      s.nutrients.proteinG <= 8 &&
      s.nutrients.proteinG < garnishProtein
    ) {
      garnish = i;
      garnishProtein = s.nutrients.proteinG;
    }
  });
  if (garnish >= 0) return garnish;
  /* 3. A floor-carrying extra the day can spare. */
  for (let i = 0; i < items.length; i++) {
    const food = foodAt(i)!;
    if (!droppable(i) || items[i]!.layer !== "finishing") continue;
    if (isMilkOrCurd(food) && totals.milkCurdG - items[i]!.grams >= FLOOR_MILK_CURD_G) return i;
    if (groupOf(food) === "fruits" && totals.fruitG - items[i]!.grams >= FLOOR_FRUIT_G) return i;
  }
  /* 4. The weakest remaining protein item. */
  let weakest = -1;
  let weakestProtein = Infinity;
  items.forEach((s, i) => {
    if (droppable(i) && s.layer === "protein" && s.nutrients.proteinG < weakestProtein) {
      weakest = i;
      weakestProtein = s.nutrients.proteinG;
    }
  });
  if (weakest >= 0) return weakest;
  /* 5. A floor-carrying extra, when nothing else can go. */
  for (let i = 0; i < items.length; i++) {
    const food = foodAt(i)!;
    if (!droppable(i) || items[i]!.layer !== "finishing") continue;
    if (isMilkOrCurd(food) || groupOf(food) === "fruits") return i;
  }
  return -1;
}

/* ---------------------------- protein closing ------------------------------ */

const proteinLayerKcal = (meal: PlanMeal): number =>
  meal.suggestions
    .filter((s) => s.layer === "protein")
    .reduce((sum, s) => sum + s.nutrients.kcal, 0);

/** Size a swap/add candidate into a meal's protein layer exactly the
 *  way the composer sizes its own later items: toward the protein aim,
 *  inside the food's cap, then down to the layer's energy share. */
function layerPortion(
  meal: PlanMeal,
  food: Food,
  proteinAimG: number,
  replacedKcal: number,
): SizedPortion | null {
  const kind = proteinKindOf(food);
  if (kind === null) return null;
  let portion = sizedPortion(food, { proteinG: proteinAimG }, proteinCapG(food, kind));
  if (!portion) return null;
  const layerKcal = proteinLayerKcal(meal) - replacedKcal + portion.nutrients.kcal;
  if (layerKcal > PROTEIN_LAYER_MAX_MEAL_SHARE * meal.kcal) {
    portion = sizedPortion(
      food,
      { kcal: PROTEIN_LAYER_MAX_MEAL_SHARE * meal.kcal - (proteinLayerKcal(meal) - replacedKcal) },
      proteinCapG(food, kind),
    );
  }
  return portion;
}

/** Eligible protein candidates for a meal, in closing order: the
 *  density band first (foods whose at-cap protein is within 80% of the
 *  best available — density leads, but near-equals keep the day's
 *  rotation, so consecutive days do not converge on one food), each
 *  band ordered unused-today first, then by rotation order. */
function proteinCandidates(ctx: ComposeContext, meal: PlanMeal): Food[] {
  const inMeal = new Set(meal.suggestions.map((s) => s.foodId));
  const eligible = ctx.ordered.filter((food) => {
    if (inMeal.has(food.id)) return false;
    const kind = proteinKindOf(food);
    return kind !== null;
  });
  const effective = (food: Food): number => {
    const kind = proteinKindOf(food)!;
    return nutrientsForGrams(food.per100g, proteinCapG(food, kind)).proteinG;
  };
  const best = eligible.reduce((max, food) => Math.max(max, effective(food)), 0);
  const inBand = (food: Food) => effective(food) >= 0.8 * best;
  const band = eligible
    .filter(inBand)
    .sort((a, b) => Number(ctx.used.has(a.id)) - Number(ctx.used.has(b.id)));
  const rest = eligible.filter((food) => !inBand(food)).sort((a, b) => effective(b) - effective(a));
  return [...band, ...rest];
}

/** Resize every protein item that sits below its cap up as far as the
 *  cap and the layer's energy share allow. Returns true if any moved. */
function resizeProteinItems(meals: PlanMeal[], byId: ReadonlyMap<string, Food>): boolean {
  let moved = false;
  for (const meal of meals) {
    if (meal.meal === "snack") continue;
    meal.suggestions.forEach((s, idx) => {
      if (s.layer !== "protein") return;
      const food = byId.get(s.foodId);
      if (!food) return;
      const kind = proteinKindOf(food);
      if (kind === null) return;
      const cap = proteinCapG(food, kind);
      if (s.grams >= cap || food.per100g.kcal <= 0) return;
      const headroomKcal = PROTEIN_LAYER_MAX_MEAL_SHARE * meal.kcal - proteinLayerKcal(meal);
      if (headroomKcal <= 0) return;
      const maxGrams = s.grams + headroomKcal / (food.per100g.kcal / 100);
      const newGrams = Math.min(cap, floor5(maxGrams));
      if (newGrams >= s.grams + 5) {
        setPortion(meal, idx, food, newGrams);
        moved = true;
      }
    });
  }
  return moved;
}

/** Swap a meal's protein items for denser eligible sources when the
 *  swap honestly gains (≥2 g of protein after caps and the layer
 *  energy share). Items are tried weakest-first — the weakest is where
 *  the gain lives, but when its slot cannot take a denser food (the
 *  layer's energy share binds), the next item gets its chance. One
 *  swap per meal per call. */
function swapWeakestProteinItems(
  ctx: ComposeContext,
  meals: PlanMeal[],
  targetProteinG: number,
): boolean {
  let moved = false;
  for (const meal of meals) {
    if (meal.meal === "snack") continue;
    if (dayProteinOf(meals) >= targetProteinG) break;
    const proteinIdx = meal.suggestions
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.layer === "protein")
      .sort((a, b) => a.s.nutrients.proteinG - b.s.nutrients.proteinG);
    let swapped = false;
    for (const { s: item, i } of proteinIdx) {
      if (swapped) break;
      const deficit = targetProteinG - dayProteinOf(meals);
      for (const candidate of proteinCandidates(ctx, meal)) {
        const portion = layerPortion(
          meal,
          candidate,
          item.nutrients.proteinG + deficit,
          item.nutrients.kcal,
        );
        if (!portion) continue;
        if (portion.nutrients.proteinG - item.nutrients.proteinG < 2) continue;
        meal.suggestions[i] = recordSuggestion(ctx, candidate, portion, "protein");
        moved = true;
        swapped = true;
        break;
      }
    }
  }
  return moved;
}

/** Add a protein source to a meal that still has room — under the
 *  protein-item limit and the plate cap — when swaps and resizes were
 *  not enough. A garnish is not an add: the portion must carry ≥3 g. */
function addProteinItems(ctx: ComposeContext, meals: PlanMeal[], targetProteinG: number): boolean {
  let moved = false;
  for (const meal of meals) {
    if (meal.meal === "snack") continue;
    /* P5: a dish-composed meal's protein closing belongs to the
       top-up pass — this pass must not stock its plate with raw
       protein foods behind the dishes' back. */
    if (meal.dishes.length > 0) continue;
    if (dayProteinOf(meals) >= targetProteinG) break;
    const proteinItems = meal.suggestions.filter((s) => s.layer === "protein").length;
    if (proteinItems >= MAX_PROTEIN_ITEMS_PER_MEAL) continue;
    if (meal.suggestions.length >= MAX_MAIN_MEAL_ITEMS) continue;
    const deficit = targetProteinG - dayProteinOf(meals);
    for (const candidate of proteinCandidates(ctx, meal)) {
      const portion = layerPortion(meal, candidate, deficit, 0);
      if (!portion || portion.nutrients.proteinG < 3) continue;
      meal.suggestions.push(recordSuggestion(ctx, candidate, portion, "protein"));
      moved = true;
      break;
    }
  }
  return moved;
}

/**
 * Protein closing (P3): the P2 composer aims each meal at its protein
 * split but stops at four capped items, so a high-protein day landed
 * at 80–95% of its guide with nothing said. When the composed day
 * falls below 95% of the target, this pass works it toward the full
 * target — resizes first (the rotation's own foods, grown to their
 * caps), then swaps (the weakest item in a meal for a denser source),
 * then adds (a further source where the plate has room) — always
 * inside the portion caps and the protein layer's energy share. What
 * it cannot close, the plan's notes name with the true figure.
 */
function closeProteinGap(
  ctx: ComposeContext,
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  targetProteinG: number,
): void {
  if (dayProteinOf(meals) >= PROTEIN_CLOSE_FRACTION * targetProteinG) return;
  for (let round = 0; round < 8; round++) {
    if (dayProteinOf(meals) >= targetProteinG) break;
    let moved = resizeProteinItems(meals, byId);
    if (dayProteinOf(meals) >= targetProteinG) break;
    moved = swapWeakestProteinItems(ctx, meals, targetProteinG) || moved;
    if (dayProteinOf(meals) >= targetProteinG) break;
    moved = addProteinItems(ctx, meals, targetProteinG) || moved;
    if (!moved) break;
  }
}

/* --------------------------- energy reconciliation -------------------------- */

/**
 * Energy reconciliation (P3): the P2 composer stacked its layers and
 * floor-chasing extras and never reconciled — the owner's day landed
 * at 108–114% of its energy guide. After composition, a day over
 * +3% is trimmed back, in an order that costs the day the least of
 * what it values: finishing extras beyond the day's floors first
 * (within a food, the least protein per kcal goes first), then grain
 * bases (never below 60 g), then measured oils (never below 5 g). A
 * day under −3% is fed back up: oils to their cap, then nuts/seeds,
 * then dairy extras, then bases. Vegetables and protein items are
 * never trimmed, and a floor once met is never broken by trimming.
 */
function reconcileEnergy(
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  targets: NutritionTargets,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): void {
  const kcal = dayKcalOf(meals);
  if (kcal > ENERGY_TRIM_TRIGGER * targets.kcal) trimEnergy(meals, byId, targets, dishById);
  else if (kcal < ENERGY_ADD_TRIGGER * targets.kcal) addEnergy(meals, byId, targets);
}

function trimEnergy(
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  targets: NutritionTargets,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): void {
  let excess = dayKcalOf(meals) - ENERGY_TRIM_TRIGGER * targets.kcal;
  const kcalPerGram = (food: Food) => food.per100g.kcal / 100;
  const proteinPerKcal = (s: PlanSuggestion) =>
    s.nutrients.kcal > 0 ? s.nutrients.proteinG / s.nutrients.kcal : Infinity;

  /* A cut target: the meal plus the suggestion OBJECT. Cuts replace or
     remove suggestions, shifting indices — the object is re-located by
     identity at cut time, so a caller's ordering is never staled. */
  interface Ref {
    meal: PlanMeal;
    s: PlanSuggestion;
  }
  const refsWhere = (pred: (s: PlanSuggestion, food: Food) => boolean): Ref[] => {
    const refs: Ref[] = [];
    for (const meal of meals) {
      for (const s of meal.suggestions) {
        const food = byId.get(s.foodId);
        if (food && pred(s, food)) refs.push({ meal, s });
      }
    }
    return refs;
  };
  /* Cut one item by up to `maxCutG` grams (in 5 g steps toward the
     excess), keeping at least `minG`; an item the cut would take under
     `removeBelowG` is removed whole instead. Returns the kcal saved,
     measured on the stored (rounded) nutrients the plan displays. */
  const cut = (ref: Ref, maxCutG: number, minG: number, removeBelowG: number): number => {
    const idx = ref.meal.suggestions.indexOf(ref.s);
    if (idx < 0) return 0;
    const food = byId.get(ref.s.foodId);
    if (!food || kcalPerGram(food) <= 0) return 0;
    const wanted = Math.min(maxCutG, ceil5(excess / kcalPerGram(food)));
    if (wanted <= 0) return 0;
    const newGrams = ref.s.grams - wanted;
    /* The snack never empties (P12): a whole-removal here once took
       a small snack's only item to settle a few kcal of excess,
       leaving an empty sitting the composition had honestly
       filled — the snack's last item is cut to its floor instead. */
    const keepLastSnackItem = ref.meal.meal === "snack" && ref.meal.suggestions.length <= 1;
    if (newGrams < removeBelowG && !keepLastSnackItem) {
      const saved = ref.s.nutrients.kcal;
      ref.meal.suggestions.splice(idx, 1);
      if (ref.meal.suggestions.length === 0 && ref.meal.dishes.length === 0) {
        setMealNote(ref.meal, EMPTY_MEAL_REASON);
      }
      return saved;
    }
    const kept = Math.max(minG, newGrams);
    if (kept >= ref.s.grams) return 0;
    const before = ref.s.nutrients.kcal;
    setPortion(ref.meal, idx, food, kept);
    return before - ref.meal.suggestions[idx]!.nutrients.kcal;
  };
  const cutCategory = (
    refs: Ref[],
    maxCutOf: (s: PlanSuggestion) => number,
    minG: number,
    removeBelowG: number,
  ): void => {
    for (const ref of refs) {
      if (excess <= 0) return;
      excess -= cut(ref, maxCutOf(ref.s), minG, removeBelowG);
    }
  };
  const byProteinPerKcal = (a: Ref, b: Ref) => proteinPerKcal(a.s) - proteinPerKcal(b.s);
  const byKcalDesc = (a: Ref, b: Ref) => b.s.nutrients.kcal - a.s.nutrients.kcal;

  /* 1a. Nuts/seeds extras — no floor rides on them. An item cut under
     15 g is a garnish; it goes whole rather than shrinking to one. */
  cutCategory(
    refsWhere((s, food) => groupOf(food) === "nuts_seeds").sort(byKcalDesc),
    () => Infinity,
    15,
    15,
  );
  /* 1b. Fruit beyond the day's floor — only the surplus is cut (the
     cap is re-read per item, so the floor itself is never crossed),
     and a fruit portion is never trimmed below a real portion. */
  if (excess > 0 && floorTotalsOf(meals, byId, dishById).fruitG > FLOOR_FRUIT_G) {
    cutCategory(
      refsWhere((s, food) => groupOf(food) === "fruits").sort(byProteinPerKcal),
      () => floorTotalsOf(meals, byId, dishById).fruitG - FLOOR_FRUIT_G,
      50,
      0,
    );
  }
  /* 1c. Milk/curd beyond the day's floor — same discipline. */
  if (excess > 0 && floorTotalsOf(meals, byId, dishById).milkCurdG > FLOOR_MILK_CURD_G) {
    cutCategory(
      refsWhere((s, food) => isMilkOrCurd(food)).sort(byProteinPerKcal),
      () => floorTotalsOf(meals, byId, dishById).milkCurdG - FLOOR_MILK_CURD_G,
      50,
      0,
    );
  }
  /* 2. Grain bases, least protein per kcal first, never below 60 g. */
  if (excess > 0) {
    cutCategory(
      refsWhere((s) => s.layer === "base").sort(byProteinPerKcal),
      (s) => s.grams - 60,
      60,
      0,
    );
  }
  /* 3. Measured oils, never below 5 g. */
  if (excess > 0) {
    cutCategory(
      refsWhere((s, food) => groupOf(food) === "fats_oils").sort(byKcalDesc),
      (s) => s.grams - 5,
      5,
      0,
    );
  }
}

function addEnergy(
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  targets: NutritionTargets,
): void {
  const ceiling = (ENERGY_TRIM_TRIGGER - 0.01) * targets.kcal;
  const grow = (
    pred: (s: PlanSuggestion, food: Food) => boolean,
    capOf: (food: Food) => number,
  ) => {
    for (const meal of meals) {
      for (let idx = 0; idx < meal.suggestions.length; idx++) {
        if (dayKcalOf(meals) >= targets.kcal) return;
        const s = meal.suggestions[idx]!;
        const food = byId.get(s.foodId);
        if (!food || !pred(s, food) || food.per100g.kcal <= 0) continue;
        const headroom = capOf(food) - s.grams;
        if (headroom < 5) continue;
        const room = ceiling - dayKcalOf(meals);
        if (room <= 0) return;
        const add = Math.min(headroom, floor5(room / (food.per100g.kcal / 100)));
        if (add >= 5) setPortion(meal, idx, food, s.grams + add);
      }
    }
  };
  grow(
    (s, food) => groupOf(food) === "fats_oils",
    () => CAP_FAT_G,
  );
  grow(
    (s, food) => groupOf(food) === "nuts_seeds",
    () => CAP_NUTS_G,
  );
  grow(
    (s, food) => isMilkOrCurd(food),
    () => CAP_FINISHING_DAIRY_G,
  );
  grow(
    (s) => s.layer === "base",
    (food) => (groupOf(food) === "cereals_grains" ? CAP_GRAIN_DRY_G : CAP_UNCLASSIFIED_BASE_G),
  );
}

/**
 * The plan's composition reasons: every day-level aim the suggestions
 * could not reach, as STRUCTURED data (brief v4 — the words live in
 * src/lib/reasons.ts; this pass returns the numbers it measured).
 * Floors are ICMR-NIN My Plate amounts (held, not scaled — §1);
 * the diversity aims are the research's operationalisation (§7). A pool
 * that simply does not contain a group is a pool fact and is stated as
 * one — noted, never faked. Since P3 the reasons also judge the day's
 * own targets: a protein total still under 95% of the guide after
 * closing, or an energy total outside ±5% after reconciliation, is
 * named with its true figure. Every number here is recomputed from
 * the final suggestions — the reasons describe the plan as it stands,
 * never as it was first composed.
 */
function compositionReasons(
  meals: readonly PlanMeal[],
  pool: readonly Food[],
  targets: NutritionTargets,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): PlanReason[] {
  const reasons: PlanReason[] = [];
  const byId = new Map(pool.map((f) => [f.id, f]));
  const totals = floorTotalsOf(meals, byId, dishById);
  if (totals.vegG < FLOOR_VEGETABLES_G) {
    reasons.push({ kind: "veg-shortfall", actualG: totals.vegG, guidelineG: FLOOR_VEGETABLES_G });
  }
  if (totals.fruitG < FLOOR_FRUIT_G) {
    reasons.push({ kind: "fruit-shortfall", actualG: totals.fruitG, guidelineG: FLOOR_FRUIT_G });
  }
  if (totals.milkCurdG < FLOOR_MILK_CURD_G) {
    reasons.push({
      kind: "milk-curd-shortfall",
      actualG: totals.milkCurdG,
      guidelineG: FLOOR_MILK_CURD_G,
    });
  }
  const proteinSources = new Set<string>();
  const poolGroups = new Set<FoodGroup>();
  for (const meal of meals) {
    for (const s of meal.suggestions) {
      /* Protein-layer items count by role; top-ups and snack items
         count when they carry real protein (≥5 g). */
      if (s.layer === "protein") proteinSources.add(s.foodId);
      else if (s.nutrients.proteinG >= 5) proteinSources.add(s.foodId);
    }
    /* P5: a plan dish carrying real protein is a protein source, and
       its ingredient lines speak for their food groups — a dish-based
       day is judged by the same diversity aims as a food-based one. */
    for (const planDish of meal.dishes) {
      if (planDish.nutrients.proteinG >= 5) proteinSources.add(`dish:${planDish.dishId}`);
    }
  }
  for (const food of pool) {
    if (food.classification) poolGroups.add(food.classification.group);
  }
  const suggestedGroups = new Set<FoodGroup>();
  for (const meal of meals) {
    for (const s of meal.suggestions) {
      const group = byId.get(s.foodId)?.classification?.group;
      if (group) suggestedGroups.add(group);
    }
    for (const planDish of meal.dishes) {
      const dish = dishById.get(planDish.dishId);
      if (!dish) continue;
      for (const line of dish.lines) {
        const group = byId.get(line.foodId)?.classification?.group;
        if (group) suggestedGroups.add(group);
      }
    }
  }
  if (proteinSources.size < AIM_DISTINCT_PROTEIN_SOURCES) {
    reasons.push({ kind: "protein-sources-few", count: proteinSources.size });
  }
  if (suggestedGroups.size < AIM_FOOD_GROUPS) {
    reasons.push(
      poolGroups.size < AIM_FOOD_GROUPS
        ? { kind: "food-groups-few", count: suggestedGroups.size, poolCount: poolGroups.size }
        : { kind: "food-groups-few", count: suggestedGroups.size, poolCount: null },
    );
  }
  const protein = dayProteinOf(meals);
  const kcal = dayKcalOf(meals);
  if (protein < PROTEIN_CLOSE_FRACTION * targets.proteinG) {
    if (kcal > (1 + ENERGY_NOTE_BAND) * targets.kcal) {
      /* P12: when the day is already over its energy guide, the
         energy is what stopped a top-up, not the portion caps —
         the note says which, and whether a top-up is in the day
         (the gap scoop fires exactly into this corner when a
         powder the pool allows exists). */
      const powderTopUpInDay = meals.some((m) =>
        m.suggestions.some((s) => {
          if (s.layer !== "topup") return false;
          const food = byId.get(s.foodId);
          return food !== undefined && isProteinPowder(food);
        }),
      );
      reasons.push({
        kind: "protein-under",
        actualG: protein,
        targetG: targets.proteinG,
        blocker: powderTopUpInDay ? "energy-topup-in-day" : "energy-no-topup",
      });
    } else {
      reasons.push({
        kind: "protein-under",
        actualG: protein,
        targetG: targets.proteinG,
        blocker: "caps",
      });
    }
  } else if (protein > DAY_PROTEIN_MAX * targets.proteinG) {
    /* P11: an overshoot is named too — before this pass the reasons
       judged a day under its protein guide but said nothing about
       a day over it, so the imbalance the owner saw had no words. */
    reasons.push({ kind: "protein-over", actualG: protein, targetG: targets.proteinG });
  }
  if (kcal > (1 + ENERGY_NOTE_BAND) * targets.kcal) {
    reasons.push({
      kind: "kcal-off-guide",
      actualKcal: kcal,
      targetKcal: targets.kcal,
      direction: "over",
    });
  } else if (kcal < (1 - ENERGY_NOTE_BAND) * targets.kcal) {
    reasons.push({
      kind: "kcal-off-guide",
      actualKcal: kcal,
      targetKcal: targets.kcal,
      direction: "under",
    });
  }
  return reasons;
}

/* ------------------------- P5 dish-first composition ----------------------- */

interface DishCandidate {
  dish: Dish;
  /** Per-serving nutrients, computed — the only way they exist. */
  nutrients: Nutrients;
}

interface DishPoolData {
  candidates: DishCandidate[];
  byId: Map<string, Dish>;
}

/** Can this candidate carry a main meal — a main or one-pot rice
 *  dish, or a breakfast dish at the breakfast slot? The count the
 *  pool floors below are stated in. (MAIN_MEAL_CATEGORIES is
 *  declared with the slot machinery; it is read here at call time,
 *  like the kitchen gates read it.) */
function isMainCapableDish(candidate: DishCandidate): boolean {
  return (
    MAIN_MEAL_CATEGORIES.includes(candidate.dish.category) ||
    candidate.dish.category === "breakfast"
  );
}

/** Can this candidate carry a LUNCH or DINNER slot — the slots only
 *  main and one-pot rice dishes serve? The kitchen gate's floor is
 *  stated in these, not in isMainCapableDish: the owner's own
 *  no-cook pool held breakfasts and shakes enough to pass a
 *  breakfast-inclusive count while offering literally nothing a
 *  lunch or dinner slot could serve, so the ladder never fired and
 *  the mains fell back to layered raw foods. A floor that cannot
 *  see the starving slots is not a floor. */
function isMainSlotDish(candidate: DishCandidate): boolean {
  return MAIN_MEAL_CATEGORIES.includes(candidate.dish.category);
}

/** The budget floor (P13): the in-budget pool is trusted to carry
 *  the plan alone only while it still offers at least this many
 *  main-capable dishes — a week of distinct mains, breakfasts and
 *  rotations cannot be composed from a handful — AND at least this
 *  many main-capable dishes carrying the anchor protein aim
 *  (≥25 g a serving, the protein waves' own bar). Below either,
 *  the budget is widened to the full pool and the plan says so:
 *  a budget that silently deletes every protein dish is not a
 *  budget the plan can honour and still feed the person. */
const BUDGET_POOL_MIN_MAIN_CAPABLE = 24;
const BUDGET_POOL_MIN_PROTEIN_MAINS = 4;

/**
 * The dishes a plan may serve this person, judged by the plan's own
 * gates — the qualification the plan's dish idea has always used:
 *  · the dish suits the person's dietary pattern — `dishPatterns`,
 *    every ingredient line judged by its classification;
 *  · every ingredient line sits in the eligible pool for the reference
 *    set — the provenance gate, the pattern judgement and the person's
 *    own allergy / intolerance / dislike name-matching, applied to the
 *    dish's line foods exactly as the plan applies them to foods;
 *  · the budget tier the person stated in the Assessment (and only
 *    there) is a PREFERENCE (P13 — it was a hard cap until method
 *    12, and the raw-plan diagnosis showed what that did: priced at
 *    the old bands, a stated budget silently deleted every servable
 *    protein dish at tier 1 and most of the wave at tier 2). The
 *    pool prefers dishes at or under the tier; when the in-budget
 *    pool falls below the floor above, the pool widens to every
 *    qualifying dish and the returned note names the relaxation.
 *    The pattern, the eligibility gates and Condition Modes never
 *    widen — only the budget does.
 * A dish Bloom cannot price — a line naming a food outside the
 * reference set — is skipped, never guessed at.
 */
function dishPoolFor(
  profile: HealthProfile,
  dishes: readonly Dish[],
  activeModes: readonly ModeId[] = [],
): { data: DishPoolData | null; reasons: PlanReason[] } {
  const pattern = planPatternOf(profile.dietary.pattern);
  const eligible = new Set(eligiblePool(profile, USDA_REFERENCE_FOODS).map((f) => f.id));
  const budgetTier = profile.dietary.budgetTier;
  const candidates: DishCandidate[] = [];
  for (const dish of dishes) {
    if (!dish.lines.every((line) => eligible.has(line.foodId))) continue;
    try {
      if (pattern !== null && !dishPatterns(dish).includes(pattern)) continue;
      const nutrients = dishNutrients(dish).nutrients;
      /* System 14 (Condition Modes): the person's own switched-on
       * modes judge the dish on its computed nutrients, on top of —
       * never instead of — the gates above. */
      if (activeModes.length > 0 && !dishPassesModes(dish, nutrients, activeModes)) continue;
      candidates.push({ dish, nutrients });
    } catch {
      /* An unresolvable line — the dish is not planned with. */
      continue;
    }
  }
  if (candidates.length === 0) return { data: null, reasons: [] };
  const poolOf = (list: readonly DishCandidate[]): DishPoolData => ({
    candidates: [...list],
    byId: new Map(list.map((c) => [c.dish.id, c.dish])),
  });
  if (budgetTier === null) return { data: poolOf(candidates), reasons: [] };
  const inBudget = candidates.filter((c) => c.dish.budgetTier <= budgetTier);
  const inBudgetMains = inBudget.filter(isMainCapableDish);
  const inBudgetProteinMains = inBudgetMains.filter(
    (c) => c.nutrients.proteinG >= ANCHOR_AIM_MAIN_G,
  );
  if (
    inBudgetMains.length >= BUDGET_POOL_MIN_MAIN_CAPABLE &&
    inBudgetProteinMains.length >= BUDGET_POOL_MIN_PROTEIN_MAINS
  ) {
    return { data: poolOf(inBudget), reasons: [] };
  }
  const ceiling =
    budgetTier === 1
      ? BUDGET_TIER_1_MAX_PER_SERVING
      : budgetTier === 2
        ? BUDGET_TIER_2_MAX_PER_SERVING
        : null;
  return {
    data: poolOf(candidates),
    reasons: [{ kind: "budget-widened", ceilingRupees: ceiling }],
  };
}

/* --------------------- P10 behavioural kitchen gates ---------------------- */

/** The equipment a shared hostel kitchen is assumed to offer when the
 *  person stated the setting but not the equipment (spec §10.2's
 *  hostel default): the basics a shared kitchen has — a stove and a
 *  fridge. Anything more would invent facilities. An explicit
 *  equipment answer always overrides this. */
const HOSTEL_EQUIPMENT: readonly EquipmentItem[] = ["stove", "fridge"];

/** The equipment the kitchen gates judge against: the stated list
 *  (a stated "none" means the empty set), else the eating setting's
 *  default, else null — no gate. */
function effectiveEquipment(
  behavioural: BehaviouralProfile,
): ReadonlySet<EquipmentItem> | null {
  if (behavioural.equipment.length > 0) {
    return new Set(behavioural.equipment.filter((item) => item !== "none"));
  }
  if (behavioural.eatingSetting === "hostel") return new Set(HOSTEL_EQUIPMENT);
  return null;
}

/** The prep-time cap for a plan: the stated band, else the hostel
 *  default (the lowest offered band — a shared kitchen's reality),
 *  else no cap. */
function effectivePrepCapMinutes(behavioural: BehaviouralProfile): PrepTimeMaxMinutes | null {
  if (behavioural.prepTimeMaxMinutes !== null) return behavioural.prepTimeMaxMinutes;
  if (behavioural.eatingSetting === "hostel") return PREP_TIME_BANDS[0] ?? null;
  return null;
}

/** The kitchen floor (P13): a gated pool still offering at least
 *  this many main-SLOT dishes (isMainSlotDish — lunch/dinner
 *  carriers) can carry a day's mains with rotation to spare.
 *  Below it, the answer set is starving the plan — the condition
 *  the relaxation ladder exists for. */
const KITCHEN_POOL_MIN_MAIN_CAPABLE = 3;

/** The no-cook rotation floor (P13): "no cooking" is the one gate
 *  whose strict pool can clear the survival floor yet still
 *  sentence the person to the same dishes forever — the whole
 *  library holds exactly 3 no-cook main-slot dishes (measured
 *  2026-11-19), so a literal reading serves those three in
 *  rotation for every lunch and dinner, indefinitely. When "no
 *  cooking" is COMPOUNDED by another kitchen answer (a prep cap
 *  or an equipment list — the owner's own set), the gate is
 *  judged against this higher floor instead: a week of distinct
 *  lunches and dinners needs at least this many carriers. Below
 *  it, the ladder treats "no cooking" as a preference, as F3's
 *  stage 2 prescribes, and names it. A bare "no cooking" with no
 *  compounding answer keeps the gate's word exactly — the P10
 *  promise stands where the answer set leaves a servable pool. */
const NO_COOK_ROTATION_FLOOR = 8;

/**
 * The P10 kitchen gates over the dish pool (spec §10.2), with the
 * P13 relaxation ladder: the factual kitchen answers, applied after
 * the pool's own pattern/budget/mode gates and before any pick —
 * the pool the composer sees is the pool the person's kitchen
 * allows, unless the answers starve it.
 *
 *  · Equipment and cooking ability are gates, judged through the
 *    ONE preparation-needs function (`dishPreparationNeeds`): a
 *    dish whose needed equipment is not a subset of the person's
 *    set is out, and a person who does not cook gets only no-cook
 *    dishes.
 *  · The prep-time cap binds WEEKDAY plans only (the answer speaks
 *    about a typical day). It relaxes in the spec's stated order —
 *    the cap rises through the offered bands, then lifts — but
 *    only as far as the first stage that still offers a main-meal
 *    dish, and a relaxation is named in the returned notes.
 *  · THE LADDER (P13): when the gated, capped pool still offers
 *    fewer than KITCHEN_POOL_MIN_MAIN_CAPABLE main-SLOT dishes
 *    while the UNGATED pool offers at least that many, the answers
 *    — not the library — are what starve the plan, and the gates
 *    relax in stages: (1) the prep-time cap rises through its
 *    bands to the first that restores the floor (set aside
 *    entirely only when no band does); (2) "no cooking" becomes a
 *    preference — cooked dishes return and no-cook dishes get a
 *    bounded pick preference (`preferNoCook`); (3) the equipment
 *    set widens by one item; (4) the equipment gate lifts. The
 *    first stage that restores the floor is where the pool stops,
 *    and one note names every stage that fired.
 *    Until method 12 the same starvation silently handed the whole
 *    day to layered plain foods — the raw plan the owner was
 *    served. When the ungated pool itself is below the floor (a
 *    small custom dish set, a heavily mode-cut pool), the gates
 *    keep their word exactly: relaxation recovers dishes the
 *    library has; it cannot invent dishes a pool does not contain.
 *    Pattern, allergies, dislikes and Condition Modes are upstream
 *    of this function and are never relaxed by it.
 */
function gateDishPoolForKitchen(
  data: DishPoolData,
  behavioural: BehaviouralProfile,
  day: string,
): { data: DishPoolData | null; reasons: PlanReason[]; preferNoCook: boolean } {
  const equipment = effectiveEquipment(behavioural);
  const noCookOnly = behavioural.cookingAbility === "none";
  const cap = effectivePrepCapMinutes(behavioural);
  const dayOfWeek = new Date(`${day}T12:00:00Z`).getUTCDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const capApplies = cap !== null && isWeekday;

  /* The gate's floor counts main-SLOT dishes (see isMainSlotDish):
   *  breakfasts and shakes cannot rescue a lunch. */
  const mainCapableCount = (list: readonly DishCandidate[]): number =>
    list.filter(isMainSlotDish).length;

  const kitchenFilter = (
    list: readonly DishCandidate[],
    opts: { noCook: boolean; maxMissingEquipment: number | null },
  ): DishCandidate[] =>
    list.filter((c) => {
      const needs = dishPreparationNeeds(c.dish);
      if (opts.noCook && !needs.noCook) return false;
      if (equipment !== null && opts.maxMissingEquipment !== null) {
        const missing = needs.equipment.filter((item) => !equipment.has(item)).length;
        if (missing > opts.maxMissingEquipment) return false;
      }
      return true;
    });

  /* The prep-time cap staging (P10's discipline, unchanged): the
   * first band stage at or above the cap that still offers a
   * main-capable dish, with its note when the stage moved. */
  const applyCap = (
    list: readonly DishCandidate[],
  ): { list: readonly DishCandidate[]; reason: PlanReason | null } => {
    if (!capApplies || cap === null) return { list, reason: null };
    if (!list.some((c) => isMainSlotDish(c))) return { list, reason: null };
    const stages: readonly number[] = [...PREP_TIME_BANDS.filter((b) => b >= cap), Infinity];
    for (const stage of stages) {
      const within = list.filter((c) => c.dish.timeMinutes <= stage);
      if (!within.some((c) => isMainSlotDish(c))) continue;
      if (stage === cap) return { list: within, reason: null };
      return {
        list: within,
        reason:
          stage === Infinity
            ? { kind: "kitchen-cap-quickest", capMinutes: cap }
            : { kind: "kitchen-cap-raised", capMinutes: cap, stageMinutes: stage },
      };
    }
    return { list, reason: null };
  };

  const asData = (list: readonly DishCandidate[]): DishPoolData =>
    list === data.candidates ? data : { candidates: [...list], byId: data.byId };

  /* Level 0 — the gates exactly as stated, then the cap. */
  const strict = kitchenFilter(data.candidates, {
    noCook: noCookOnly,
    maxMissingEquipment: equipment === null ? null : 0,
  });
  const strictCapped = applyCap(strict);
  /* The floor this gate must restore: the survival floor, or —
   *  for a compounded "no cooking" whose strict pool falls below
   *  the rotation floor — the rotation floor (see
   *  NO_COOK_ROTATION_FLOOR). */
  const floor =
    noCookOnly &&
    (capApplies || equipment !== null) &&
    mainCapableCount(strictCapped.list) < NO_COOK_ROTATION_FLOOR
      ? NO_COOK_ROTATION_FLOOR
      : KITCHEN_POOL_MIN_MAIN_CAPABLE;
  if (mainCapableCount(strictCapped.list) >= floor) {
    return {
      data: asData(strictCapped.list),
      reasons: strictCapped.reason ? [strictCapped.reason] : [],
      preferNoCook: false,
    };
  }
  /* The ungated pool is itself below the floor: the kitchen
   * answers are not what starves this plan, and the gates keep
   * their word — the composer falls back per slot, as it has
   * since P5, and no relaxation is claimed. */
  if (mainCapableCount(data.candidates) < floor) {
    return {
      data: asData(strictCapped.list),
      reasons: strictCapped.reason ? [strictCapped.reason] : [],
      preferNoCook: false,
    };
  }

  /* The ladder. Stage 1 is the prep-time cap, relaxed P10's own
   *  way first: rise through the offered bands to the first stage
   *  whose pool reaches the floor, and name that stage. (At the
   *  tightest band the library holds ZERO main-slot dishes at all
   *  — a 10-minute cap can never serve a dish lunch — while the
   *  20-minute band holds 23.) Only when no band reaches the
   *  floor is the cap set aside entirely, and that is named when
   *  the cap had actually cut the pool or P10's staging had
   *  already relaxed it. */
  const stagesFired: KitchenRelaxationStage[] = [];
  let preferNoCook = false;
  let pool = strict;
  if (capApplies && cap !== null) {
    const stages: readonly number[] = [...PREP_TIME_BANDS.filter((b) => b >= cap), Infinity];
    let reached = false;
    for (const stage of stages) {
      const within = strict.filter((c) => c.dish.timeMinutes <= stage);
      if (mainCapableCount(within) < floor) continue;
      pool = within;
      reached = true;
      if (stage !== cap) {
        stagesFired.push(
          stage === Infinity
            ? { stage: "prep-time-set-aside" }
            : { stage: "prep-cap-raised", minutes: stage },
        );
      }
      break;
    }
    if (!reached && (strictCapped.list.length !== strict.length || strictCapped.reason !== null)) {
      stagesFired.push({ stage: "prep-time-set-aside" });
    }
  }
  if (mainCapableCount(pool) < floor && noCookOnly) {
    pool = kitchenFilter(data.candidates, {
      noCook: false,
      maxMissingEquipment: equipment === null ? null : 0,
    });
    preferNoCook = true;
    stagesFired.push({ stage: "cooking-included" });
  }
  if (mainCapableCount(pool) < floor && equipment !== null) {
    pool = kitchenFilter(data.candidates, { noCook: false, maxMissingEquipment: 1 });
    stagesFired.push({ stage: "extra-equipment" });
  }
  if (mainCapableCount(pool) < floor && equipment !== null) {
    pool = [...data.candidates];
    stagesFired.push({ stage: "equipment-set-aside" });
  }
  /* Stages 2–4 rebuild the pool from the uncapped candidates, so
   *  the cap may have gone with them even when stage 1 named
   *  nothing (the cap had no main-slot dish left to cut in the
   *  strict pool, yet the rebuilt pool serves slower dishes).
   *  The check is direct: if the pool the plan will use holds any
   *  dish slower than the stated cap and no prep-time stage was
   *  named, name it — the reason names every relaxation that
   *  actually happened (as stage codes; reasons.ts owns the words). */
  if (
    capApplies &&
    cap !== null &&
    stagesFired.length > 0 &&
    !stagesFired.some((s) => s.stage === "prep-time-set-aside" || s.stage === "prep-cap-raised") &&
    pool.some((c) => c.dish.timeMinutes > cap)
  ) {
    stagesFired.unshift({ stage: "prep-time-set-aside" });
  }
  return {
    data: asData(pool),
    reasons: [
      {
        kind: "kitchen-relaxed",
        answers: {
          noCook: noCookOnly,
          capMinutes: capApplies && cap !== null ? cap : null,
          equipmentListed: equipment !== null,
        },
        stages: stagesFired,
      },
    ],
    preferNoCook,
  };
}

/** The day's rotation order over dish candidates: FNV-1a over
 *  `day:dish:id` — the dish idea's discipline (D4), so the same day
 *  always orders the pool the same way and consecutive days differ. */
function orderDishesForDay(candidates: readonly DishCandidate[], day: string): DishCandidate[] {
  return candidates
    .map((c) => ({ c, key: fnv1a(`${day}:dish:${c.dish.id}`) }))
    .sort((a, b) => a.key - b.key || (a.c.dish.id < b.c.dish.id ? -1 : 1))
    .map((entry) => entry.c);
}

/** The anchor protein aims: a main meal's centrepiece carries at
 *  least ~25 g of protein where the pool offers one (the dish waves'
 *  own bar); breakfast, a lighter meal, aims at ~20 g. */
const ANCHOR_AIM_MAIN_G = 25;
const ANCHOR_AIM_BREAKFAST_G = 20;

/**
 * The categories that can BE a main meal (P8): a main dish, and the
 * one-pot rice dishes (biryani, pulao, khichdi, fried rice) that are
 * complete meals in their own right. Bread, sides, raita, chutneys,
 * snacks, drinks, desserts and shakes never headline a main meal —
 * under P5 they joined as a meal's second and third dishes, which
 * is exactly the stacking P8 retires.
 */
const MAIN_MEAL_CATEGORIES: readonly DishCategory[] = ["main", "rice"];

/** The slot's candidates: dishes not already served today that can
 *  carry a main meal. Breakfast also draws on the breakfast category
 *  (which the fit cost mildly prefers there) and — P13 — on the
 *  shake category: a protein shake IS a breakfast in the protein
 *  wave's own terms, and until method 12 no slot would serve one.
 *  Lunch and dinner draw on mains and one-pot rice dishes. */
function slotCandidates(
  ordered: readonly DishCandidate[],
  meal: Meal,
  used: ReadonlySet<string>,
): DishCandidate[] {
  return ordered.filter((c) => {
    if (used.has(c.dish.id)) return false;
    if (MAIN_MEAL_CATEGORIES.includes(c.dish.category)) return true;
    return meal === "breakfast" && (c.dish.category === "breakfast" || c.dish.category === "shake");
  });
}

/** The categories that can BE the snack (P13): the protein wave's
 *  shakes and protein snacks, and breakfast dishes — the small,
 *  quick, protein-carrying end of the library. Until method 12 the
 *  snack slot was composed with an empty dish list by construction
 *  (plain foods only), which is why every shake and protein snack
 *  in the library was unservable in any plan. */
const SNACK_DISH_CATEGORIES: readonly DishCategory[] = ["shake", "snack", "breakfast"];

/** The snack slot's dish candidates: unused dishes in the snack
 *  categories. */
function snackSlotCandidates(
  ordered: readonly DishCandidate[],
  used: ReadonlySet<string>,
): DishCandidate[] {
  return ordered.filter((c) => !used.has(c.dish.id) && SNACK_DISH_CATEGORIES.includes(c.dish.category));
}

/** Within the anchor band, dishes carrying at least this much protein
 *  per 100 kcal are preferred (a derivation): at a high-protein guide
 *  the day's energy budget is the binding constraint, and a band pick
 *  at 4 g/100 kcal spends it twice as fast as one at 8. The band's
 *  protein aim is never traded away — density only orders the band. */
const ANCHOR_DENSITY_AIM = 6;

/** The guide density (grams of protein per kcal) at or above which
 *  a plan counts as a high-protein plan for the protein-wave
 *  preference (P13): ≈9 g of protein per 100 kcal. The owner's own
 *  corner (171 g on 1,350 kcal ≈ 12.7) sits far above it; an
 *  ordinary maintenance guide (120 g on 2,200 kcal ≈ 5.5) far
 *  below — the preference switches on the guide's own shape, not
 *  on the goal's name. */
const PROTEIN_WAVE_GUIDE_DENSITY = 0.09;

/** The P7 dish bias: which dishes the learning pass has an opinion
 *  about. Groups, in the order they lead: dishes the person logs
 *  repeatedly; dishes rich in a micronutrient the logged week runs
 *  short of; everything else; dishes a completed plan served that
 *  the log never took up. A dish in several groups takes its best
 *  group — a micro-rich dish is never pushed back for going
 *  unlogged, and a favourite is never demoted. */
interface DishBias {
  favoured: ReadonlySet<string>;
  microRich: ReadonlySet<string>;
  deprioritised: ReadonlySet<string>;
}

function dishBiasGroup(bias: DishBias | undefined, dishId: string): number {
  if (!bias) return 2;
  if (bias.favoured.has(dishId)) return 0;
  if (bias.microRich.has(dishId)) return 1;
  if (bias.deprioritised.has(dishId)) return 3;
  return 2;
}

/** Stable partition by bias group: within a group the incoming order
 *  (rotation, band, density) is preserved exactly, so with no bias —
 *  or a bias that names none of the list — this is the identity: the
 *  pre-P7 order, untouched. */
function orderByDishBias(list: readonly DishCandidate[], bias?: DishBias): DishCandidate[] {
  if (!bias) return [...list];
  return [...list].sort((a, b) => dishBiasGroup(bias, a.dish.id) - dishBiasGroup(bias, b.dish.id));
}

/* --------------------- P8 single-dish selection ----------------------- */

/** The servings a plan may scale one dish to: quarter steps from
 *  half a serving to two. A person cooks a dish and eats a portion
 *  of it; the scale is how the plan sizes that portion to the meal
 *  it has to be. */
const DISH_SCALE_STEPS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const DISH_SCALE_MIN = 0.5;
const DISH_SCALE_MAX = 2;
const DISH_SCALE_STEP = 0.25;

/** The ranking terms a pick is judged under (P8): the P6 protein-
 *  first lean, the P7 dish bias, the Assessment's cuisine
 *  preference, and the previous plan's served dishes — every one
 *  a ranking term, none a filter. */
interface DishPickOpts {
  proteinFirst: boolean;
  bias?: DishBias | undefined;
  /** The preferred region, or null when the preference does not
   *  name one (both / no preference / unanswered). */
  cuisine: DishRegion | null;
  /** The dishes the previous day's plan served, by meal slot:
   *  a dish the person was served yesterday in the same slot
   *  carries the served-yesterday penalty in today's pick (see
   *  SERVED_YESTERDAY_PENALTY). Absent when there is no earlier
   *  stored plan to learn from. */
  servedYesterday?: ReadonlyMap<Meal, ReadonlySet<string>> | undefined;
  /** P10: the person cooks at a basic level — dishes whose method
   *  runs past BASIC_METHOD_STEP_CAP pay the complexity cost. */
  basicCooking?: boolean | undefined;
  /** P10: the person's stated confidence is low (1–2 of 5) — the
   *  picks lean toward the dishes they already return to and the
   *  variety pressure eases (see the LOW_CONFIDENCE constants). */
  lowConfidence?: boolean | undefined;
  /** P13: the kitchen ladder relaxed "no cooking" from a gate to
   *  a preference — no-cook dishes get a bounded pull in the pick
   *  cost (see the term in dishPickCost). */
  preferNoCook?: boolean | undefined;
  /** P13: the guide's protein density is high (≥
   *  PROTEIN_WAVE_GUIDE_DENSITY), so the dedicated protein wave
   *  gets its bounded pick preference. */
  proteinWaveBonus?: boolean | undefined;
}

/**
 * The served-yesterday penalty: what it costs a dish to be picked
 * for the same slot on the day after the previous plan served it
 * there. A pure fit argmin crowns a standout fit every day — at
 * the owner fixture's 1,279 kcal lunch share one dish (632 kcal /
 * 44 g a serving, doubled) beats the runner-up by ~0.45 cost, far
 * outside the 0.2 near-tie band, so rotation and jitter never get
 * a say and lunch is the same soup all week. The penalty is sized
 * against that measured lock: margin (~0.45) + band (0.2) + ~0.1
 * of headroom, so the day after it is served the standout sits
 * outside the band and the credible cluster behind it (16 dishes
 * within +0.65 of its fit at that share) rotates through the slot.
 * It stays a finite cost, never an exclusion: a slot whose pool
 * offers nothing else still serves yesterday's dish, and the day
 * guard — which re-picks under these same costs, then repairs
 * scales against the day bands, not the pick costs — can still
 * land the day with it when nothing else lands. Two days later
 * the dish is unpenalised again: the mechanism buys alternation
 * and rotation, not banishment.
 */
const SERVED_YESTERDAY_PENALTY = 0.75;

/** The P7 bias groups as pick costs, in the groups' own order:
 *  favoured, micro-rich, unmarked, deprioritised. */
const BIAS_GROUP_COST: Readonly<Record<number, number>> = {
  0: -0.08,
  1: -0.05,
  2: 0,
  3: 0.12,
};

/** P10: the method length past which a dish counts as complex for a
 *  basic cook. Measured on the shipped library, not guessed: method
 *  lengths run 4–9 steps with the median at 6, so a cap of 6 keeps
 *  the simpler half-plus of the library unpenalised and prices the
 *  long tail. */
const BASIC_METHOD_STEP_CAP = 6;

/** P10: what a too-long method costs a basic cook's pick. Bounded
 *  like the other ranking terms — it re-orders near-equals toward
 *  simpler dishes; it cannot crown a dish that fits badly. */
const BASIC_COMPLEXITY_COST = 0.15;

/** P10: low stated confidence halves the variety pressure — the day
 *  jitter and the served-yesterday penalty both scale by this, so
 *  familiar dishes repeat more readily — while the favoured-dish
 *  pull (the P7 bias group 0) doubles. Complexity is something a
 *  person builds; the plan meets them where they said they are. */
const LOW_CONFIDENCE_VARIETY_SCALE = 0.5;
const LOW_CONFIDENCE_FAVOURED_FACTOR = 2;

/** The day's variety jitter: a small deterministic per-(day, dish)
 *  cost in [0, 0.12), seeded from the day and the dish id. The fit
 *  cost's tie classes are wide (nutrients are rounded to 0.1), so
 *  without a daily reshuffle the same best-fitting dish would win
 *  every day of the week; the jitter is far smaller than a real fit
 *  difference, so it only ever re-orders near-equals. It is a pure
 *  function of the day and the dish — the pure-pick simulation
 *  reproduces it exactly, which is what makes the sit-out honest. */
function dishDayJitter(day: string, dishId: string): number {
  let h = 2166136261;
  const s = `${day}|${dishId}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967296) * 0.12;
}

/**
 * How well a nutrient panel fits a meal's share of the day: the
 * relative energy error, plus the protein error weighted double,
 * plus a further weight on protein SHORTFALL — landing under the
 * protein share is the failure worth paying to avoid (energy can
 * be fed back at the margin; a thin dish cannot be made denser).
 * Shared by the composer, the swap re-fit and the day repair, so
 * the three can never judge a fit differently.
 */
/**
 * The scale penalty: what it costs a pick to serve a dish at other
 * than its natural serving. Convex on purpose — a quarter-step is a
 * nudge (0.04), a half-step is a choice (0.13), and the bounds are
 * genuinely expensive (×2 = 0.40, ×0.5 = 0.20): when a dish only
 * fits at an extreme scale, a better-fitting dish at a natural
 * scale should win, and the extreme survives only where the pool
 * offers nothing closer (a 1,279 kcal lunch share, where every
 * viable dish is a large one doubled). Shared by the composer and
 * the swap re-fit so both judge a portion the same way.
 */
function scalePenalty(servings: number): number {
  const d = Math.abs(servings - 1);
  return 0.1 * d + 0.3 * d * d;
}

function mealFitCost(nutrients: Nutrients, split: MealSplit): number {
  const kcalErr = Math.abs(nutrients.kcal - split.kcal) / split.kcal;
  const proteinErr = Math.abs(nutrients.proteinG - split.proteinG) / split.proteinG;
  const shortfall =
    nutrients.proteinG < split.proteinG
      ? (split.proteinG - nutrients.proteinG) / split.proteinG
      : 0;
  return kcalErr + 2 * proteinErr + shortfall;
}

/** A candidate's nutrient panel at every scale step, computed once
 *  per candidate object — the pick search and its day simulations
 *  re-judge the same panels hundreds of times per plan. */
const scaledPanelCache = new WeakMap<DishCandidate, Nutrients[]>();

function scaledPanels(candidate: DishCandidate): Nutrients[] {
  let panels = scaledPanelCache.get(candidate);
  if (!panels) {
    panels = DISH_SCALE_STEPS.map((s) => scaleNutrientPanel(candidate.nutrients, s));
    scaledPanelCache.set(candidate, panels);
  }
  return panels;
}

/** The full pick cost for one dish at one scale in one slot: the
 *  fit, plus the ranking terms — a preference for the natural
 *  serving, the protein-anchor bonus, the learning biases, the
 *  cuisine bonus, and the breakfast-category fit. Every constant is
 *  a derivation in the P2 spirit: each bonus is smaller than the
 *  fit difference a quarter-step of scale usually makes, so a
 *  ranking term can break a near-tie but never crown a dish that
 *  fits badly. The one deliberate exception is the served-yesterday
 *  penalty, which is sized to break a standout fit's lock on a
 *  slot (see SERVED_YESTERDAY_PENALTY) — it re-orders a week, it
 *  still cannot crown a dish that fits badly, because the day
 *  guard judges the composed day, not the pick. */
function dishPickCost(
  candidate: DishCandidate,
  scaled: Nutrients,
  servings: number,
  split: MealSplit,
  opts: DishPickOpts,
  day: string,
): number {
  let cost = mealFitCost(scaled, split);
  /* P10: at low stated confidence the variety jitter eases — the
   *  day reshuffles near-equals less, so familiar fits repeat. */
  cost += dishDayJitter(day, candidate.dish.id) * (opts.lowConfidence ? LOW_CONFIDENCE_VARIETY_SCALE : 1);
  cost += scalePenalty(servings);
  /* Protein-first: the anchor criterion — the dish carries the
   *  slot's protein aim in a single serving (the protein waves'
   *  own bar), or is dense enough that scaling it buys protein
   *  cheaply in energy. */
  const aim = split.meal === "breakfast" ? ANCHOR_AIM_BREAKFAST_G : ANCHOR_AIM_MAIN_G;
  const density =
    candidate.nutrients.kcal > 0
      ? (candidate.nutrients.proteinG / candidate.nutrients.kcal) * 100
      : 0;
  if (candidate.nutrients.proteinG >= aim || density >= ANCHOR_DENSITY_AIM) cost -= 0.1;
  /* P6: after a protein-shortfall log, density itself is worth
   *  paying fit for — bounded, so it stays a lean, not a takeover. */
  if (opts.proteinFirst) cost -= Math.min(density, 15) * 0.01;
  /* P7: the learning bias, as costs in the groups' own order.
   *  P10: at low stated confidence the favoured group's pull
   *  doubles — the dishes the person already returns to lead
   *  harder, because familiar is what low confidence can use. */
  const biasGroup = dishBiasGroup(opts.bias, candidate.dish.id);
  const biasCost = BIAS_GROUP_COST[biasGroup] ?? 0;
  cost +=
    opts.lowConfidence && biasGroup === 0
      ? biasCost * LOW_CONFIDENCE_FAVOURED_FACTOR
      : biasCost;
  /* The cuisine preference: a tie-breaker toward the person's
   *  region — never a filter, never worth a bad fit. */
  if (opts.cuisine !== null && dishRegion(candidate.dish) === opts.cuisine) cost -= 0.08;
  /* Served yesterday: the previous plan served this dish in this
   *  slot, so today it pays the penalty — the week's variety term,
   *  and the only one that reads the stored plan. P10: the penalty
   *  eases at low stated confidence, like the jitter. */
  if (opts.servedYesterday?.get(split.meal)?.has(candidate.dish.id)) {
    cost += SERVED_YESTERDAY_PENALTY * (opts.lowConfidence ? LOW_CONFIDENCE_VARIETY_SCALE : 1);
  }
  /* P10: a basic cook's complexity price — a method longer than
   *  the basic cap pays a bounded cost (see BASIC_METHOD_STEP_CAP). */
  if (
    opts.basicCooking &&
    dishPreparationNeeds(candidate.dish).methodSteps > BASIC_METHOD_STEP_CAP
  ) {
    cost += BASIC_COMPLEXITY_COST;
  }
  /* P13: the kitchen ladder's no-cook preference — when "no
   *  cooking" was relaxed from a gate to a preference, no-cook
   *  dishes keep this bounded pull: enough to lead among
   *  near-equals, never enough to crown a bad fit. */
  if (opts.preferNoCook && dishPreparationNeeds(candidate.dish).noCook) cost -= 0.1;
  /* P13: the protein-wave preference at a high-protein guide. The
   *  wave was built for exactly these guides, yet without a named
   *  preference it drowned among the library's hundreds of other
   *  ≥25 g dishes — measured at 7.4% of dish mains at the owner's
   *  corner with the budget unset. This is the second deliberate
   *  exception to the ranking-term sizing above (the first is the
   *  served-yesterday penalty): at a guide this dense, protein IS
   *  the day's binding constraint, and the measured fit gap
   *  between the wave and the library's standout raw-fish fits is
   *  ~0.3 — a near-tie-sized bonus never reaches the band at all.
   *  It is bounded, it switches on the guide's own density alone,
   *  and the day guard still judges the composed day: a wave pick
   *  that breaks the day's bands is re-picked like any other. */
  if (opts.proteinWaveBonus && PROTEIN_WAVE_DISH_IDS.has(candidate.dish.id)) cost -= 0.3;
  /* A breakfast dish at breakfast fits the meal's idiom. */
  if (split.meal === "breakfast" && candidate.dish.category === "breakfast") cost -= 0.04;
  return cost;
}

interface DishPick {
  candidate: DishCandidate;
  servings: number;
  cost: number;
}

/** The best (dish, scale) for a slot over the given candidates, in
 *  the order given — ties keep the earlier candidate, which is how
 *  the day's rotation order (already bias-partitioned) breaks them
 *  deterministically. */
/** The near-tie band: dishes whose best pick cost sits within this
 *  distance of the slot's optimum are, for planning purposes,
 *  equally good fits — the day's rotation chooses among them. The
 *  width is a measured compromise: at 0.5 the rotation admitted
 *  dishes half a cost away from the slot's best fit, and individual
 *  meals went lopsided (a breakfast dish at 150% of its share, a
 *  lunch dish covering 54%) even though the day guard landed the
 *  totals — a plan is read meal by meal, not as a daily sum. At
 *  0.2 the band holds genuine near-equals only; variety comes from
 *  the rotation and the day jitter among them, and a standout fit
 *  (the 1,279 kcal lunch share, where one dish beats the runner-up
 *  by ~0.45) leads as often as it deserves to. */
const DISH_PICK_BAND = 0.2;

/**
 * Pick a slot's dish: every candidate is judged at its best scale
 * by the pick cost; the dishes within the near-tie band of the
 * optimum are equally worthy, and the FIRST of them in the given
 * order wins — the caller passes the day's rotation order (already
 * bias-partitioned), so the week's plans vary among equals instead
 * of crowning the same global optimum every day. A dish returns
 * tomorrow only when it stands alone at the top of the band — and
 * a standout that stands alone by more than the band (a fit the
 * rotation cannot reach) is answered by the served-yesterday
 * penalty in the pick cost, which reads the dish the previous
 * plan ACTUALLY served from the stored plan. (The P5–P7 composers
 * simulated yesterday's pick to sit it out; under a cost-argmin
 * that simulation names the unconstrained winner, never the dish
 * actually served, so the sit-out missed exactly the repeats it
 * existed to prevent. The penalty needs no simulation: the stored
 * plan is the record of what was served.)
 */
function bestDishPick(
  cands: readonly DishCandidate[],
  split: MealSplit,
  opts: DishPickOpts,
  day: string,
  band: number = DISH_PICK_BAND,
): DishPick | null {
  let bestCost = Infinity;
  const scored: DishPick[] = [];
  for (const candidate of cands) {
    const panels = scaledPanels(candidate);
    let pick: DishPick | null = null;
    for (let i = 0; i < DISH_SCALE_STEPS.length; i++) {
      const servings = DISH_SCALE_STEPS[i]!;
      const cost = dishPickCost(candidate, panels[i]!, servings, split, opts, day);
      if (pick === null || cost < pick.cost - 1e-9) pick = { candidate, servings, cost };
    }
    if (pick !== null) {
      scored.push(pick);
      if (pick.cost < bestCost) bestCost = pick.cost;
    }
  }
  if (scored.length === 0) return null;
  const inBand = scored.filter((p) => p.cost <= bestCost + band);
  /* The cuisine preference orders the band: when the person's
   *  region has a dish among the near-equals, it leads — the
   *  preference picks among equals, it never widens the band or
   *  overrules the fit. (As a pure cost term it was inert here:
   *  band membership, not cost order, decides the pick.) */
  if (opts.cuisine !== null) {
    const regional = inBand.find((p) => dishRegion(p.candidate.dish) === opts.cuisine);
    if (regional) return regional;
  }
  /* P13: the protein-wave preference orders the band the same way,
   *  after cuisine (the person's stated taste outranks the
   *  nutritional nudge): at a high-protein guide, when a dedicated
   *  protein dish is among the near-equals, it leads. The cost
   *  term in dishPickCost does the complementary work — it pulls
   *  wave dishes into the band and shapes the day guard's
   *  re-picks, which judge by cost, not by band order. */
  if (opts.proteinWaveBonus) {
    const wave = inBand.find((p) => PROTEIN_WAVE_DISH_IDS.has(p.candidate.dish.id));
    if (wave) return wave;
  }
  return inBand[0] ?? scored[0]!;
}

function toPlanDish(candidate: DishCandidate, role: PlanDishRole, servings = 1): PlanDish {
  return {
    dishId: candidate.dish.id,
    name: candidate.dish.name.en,
    hindi: candidate.dish.name.hindi,
    role,
    servings,
    nutrients: scaleNutrientPanel(candidate.nutrients, servings),
    provenance: dishProvenance(candidate.dish),
  };
}

/** Scale a per-serving nutrient panel by a serving count — every field
 *  the source published, absence preserved (absent is not zero). */
function scaleNutrientPanel(perServing: Nutrients, servings: number): Nutrients {
  if (servings === 1) return perServing;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(perServing)) {
    if (typeof value === "number") out[key] = Math.round(value * servings * 10) / 10;
  }
  return out as unknown as Nutrients;
}

/**
 * The dish-swap seam (Vitalis's swap_dish tool, 2026-11-17): the same
 * plan with ONE dish in ONE meal replaced by another library dish —
 * the replacement the person confirmed on Vitalis's card. The new
 * PlanDish is built exactly as the composer builds one (computed
 * `dishNutrients`, recipe provenance); targets, meal shares, inputs
 * and the plan's fingerprint are untouched — a swap changes what is
 * on the plate, never what the day aims for. Null when the meal or
 * the from-dish is not in the plan, or the replacement is already in
 * that meal.
 *
 * Servings (P8): in a single-dish meal — the shape the current
 * composer writes — the replacement is RE-FIT to the meal's share:
 * the scale whose computed panel best fits the meal's kcal/protein
 * share, judged by the composer's own fit cost. In a legacy stacked
 * meal (P5–P7 plans still in storage) the replacement keeps the old
 * dish's role and servings exactly: a swap on an old plan changes
 * the dish, never the plan's structure.
 */
export function planWithDishSwapped(
  plan: DailyPlan,
  meal: Meal,
  fromDishId: string,
  dish: Dish,
): DailyPlan | null {
  const mealIndex = plan.meals.findIndex((m) => m.meal === meal);
  if (mealIndex < 0) return null;
  const target = plan.meals[mealIndex]!;
  const dishIndex = target.dishes.findIndex((d) => d.dishId === fromDishId);
  if (dishIndex < 0) return null;
  if (target.dishes.some((d) => d.dishId === dish.id)) return null;
  const old = target.dishes[dishIndex]!;
  const perServing = dishNutrients(dish).nutrients;
  let servings = old.servings;
  if (target.dishes.length === 1) {
    const split: MealSplit = { meal: target.meal, kcal: target.kcal, proteinG: target.proteinG };
    let bestCost = Infinity;
    for (const step of DISH_SCALE_STEPS) {
      const cost =
        mealFitCost(scaleNutrientPanel(perServing, step), split) + scalePenalty(step);
      if (cost < bestCost - 1e-9) {
        bestCost = cost;
        servings = step;
      }
    }
  }
  const replacement: PlanDish = {
    dishId: dish.id,
    name: dish.name.en,
    hindi: dish.name.hindi,
    role: old.role,
    servings,
    nutrients: scaleNutrientPanel(perServing, servings),
    provenance: dishProvenance(dish),
  };
  const dishes = target.dishes.map((d, i) => (i === dishIndex ? replacement : d));
  const meals = plan.meals.map((m, i) => (i === mealIndex ? { ...m, dishes } : m));
  return { ...plan, meals };
}

/**
 * Compose one main meal (P8): ONE dish, portion-scaled to the
 * meal's share of the day. Null when no dish can carry the slot —
 * the caller falls back to the layered food composition for that
 * meal, so a slot the dish pool cannot fill is composed, never
 * empty.
 */
function composeSingleDishMeal(
  ordered: readonly DishCandidate[],
  used: Set<string>,
  day: string,
  split: MealSplit,
  opts: DishPickOpts,
): PlanDish | null {
  const cands = slotCandidates(ordered, split.meal, used);
  if (cands.length === 0) return null;
  const pick = bestDishPick(cands, split, opts, day);
  if (!pick) return null;
  used.add(pick.candidate.dish.id);
  return toPlanDish(pick.candidate, "anchor", pick.servings);
}

/**
 * Compose the snack (P13): ONE dish from the snack categories,
 * portion-scaled to the snack's share of the day — the same
 * single-dish discipline as a main meal, at snack scale. This is
 * also where the top-up discipline (research R24) gets its third
 * step: a day whose protein needs help has a recognised protein
 * dish — a shake, a protein snack — served as a dish in its own
 * slot, ahead of any loose-food top-up. Null when no snack dish
 * can carry the slot; the caller falls back to the plain-food
 * snack composition, so the slot is composed, never empty.
 */
function composeSnackDish(
  ordered: readonly DishCandidate[],
  used: Set<string>,
  day: string,
  split: MealSplit,
  opts: DishPickOpts,
): PlanDish | null {
  const cands = snackSlotCandidates(ordered, used);
  if (cands.length === 0) return null;
  const pick = bestDishPick(cands, split, opts, day);
  if (!pick) return null;
  used.add(pick.candidate.dish.id);
  return toPlanDish(pick.candidate, "anchor", pick.servings);
}

/* -------------------- P14 accompaniment (the base) -------------------- */

/** The base dishes (P14): the plain steamed rice the library
 *  gained for this rule, and the phulka — the two accompaniments
 *  the plates this rule completes actually use. A base is served
 *  from the person's own gated pool or not at all: the pattern,
 *  budget and kitchen gates judge a base exactly as they judge
 *  an anchor. A base is NOT under the day's no-repeat discipline,
 *  which exists for anchors: plain rice beside two different
 *  curries is what a kitchen actually serves. */
const STEAMED_RICE_DISH_ID = "dish-steamed-rice";
const PHULKA_DISH_ID = "dish-phulka-roti";

/** The base's serving: a fixed half serving — a modest mound of
 *  rice (~135 kcal) or one phulka (~100 kcal) at the library's
 *  own serving sizes. Fixed, and never a repair lever: the day's
 *  bands are re-struck by scaling the anchor around it (see
 *  repairDishScales), so the base a person is served is the same
 *  base every day. */
const BASE_SERVINGS = 0.5;

/**
 * The accompaniment (P14, M-160): the base a gravy anchor is
 * served, or null. ONE base, beside a lunch or dinner anchor
 * that arrives in a sauce — gravy-style by the recipe derivation
 * (./gravyStyle) — and never anywhere else: not at breakfast,
 * not at the snack, not beside a dry anchor (a kebab, a fry, a
 * roast), and not beside a one-pot anchor, which the derivation
 * already refuses (a rice dish IS its base; a curry carrying its
 * own grain is a complete plate).
 *
 * Which base is cuisine fit, decided by the anchor's own region
 * (the same derivation the cuisine preference reads): a North
 * Indian anchor takes the phulka first — the roti is that
 * kitchen's accompaniment — and every other anchor takes the
 * steamed rice first, the South's and the pan-Indian default.
 * The other base is the fallback when the first is gated out of
 * the pool. The base is counted in the
 * meal and the day like any dish; the passes that follow (the
 * day guard's scale repair above all) judge the day WITH it on
 * the plate, and may shrink the anchor to hold the bands — the
 * protein band's priority is unchanged.
 */
function accompanimentFor(
  anchor: Dish,
  meal: Meal,
  ordered: readonly DishCandidate[],
): PlanDish | null {
  if (meal !== "lunch" && meal !== "dinner") return null;
  if (!dishIsGravyStyle(anchor)) return null;
  const order =
    dishRegion(anchor) === "north_indian"
      ? [PHULKA_DISH_ID, STEAMED_RICE_DISH_ID]
      : [STEAMED_RICE_DISH_ID, PHULKA_DISH_ID];
  for (const id of order) {
    const candidate = ordered.find((c) => c.dish.id === id);
    if (candidate) return toPlanDish(candidate, "base", BASE_SERVINGS);
  }
  return null;
}

/** The day bands the repair aims at: energy within ±5% of the
 *  guide (the band the day's notes judge at), protein within
 *  [95%, 110%] — met, not merely approached, and never bought at
 *  any overshoot. */
const DAY_KCAL_BAND = 0.05;
const DAY_PROTEIN_MIN = 0.95;
const DAY_PROTEIN_MAX = 1.1;

/** The repair's judgement of a day: how far its totals sit outside
 *  the bands, protein weighted heaviest — the same priorities as
 *  the meal fit, at day scale. Zero exactly when the day is in
 *  band on both. */
function dayBandCost(kcal: number, proteinG: number, targets: NutritionTargets): number {
  const kcalErr = Math.max(0, Math.abs(kcal - targets.kcal) / targets.kcal - DAY_KCAL_BAND);
  let proteinErr = 0;
  if (proteinG < DAY_PROTEIN_MIN * targets.proteinG) {
    proteinErr = (DAY_PROTEIN_MIN * targets.proteinG - proteinG) / targets.proteinG;
  } else if (proteinG > DAY_PROTEIN_MAX * targets.proteinG) {
    proteinErr = (proteinG - DAY_PROTEIN_MAX * targets.proteinG) / targets.proteinG;
  }
  return kcalErr + 2.5 * proteinErr;
}

/**
 * The meal-sanity term of the day cost: a dish-composed meal whose
 * plate lands far outside its share — under 60% (a garnish, not a
 * meal) or over 130% (two bowls of soup where a plate belongs) —
 * is a plan a person would not eat, however well the day sums.
 * Weighted below the band terms (0.5 per unit of excess, against
 * 1×/2.5× for the bands themselves): landing the day still wins
 * when the pool truly offers no other way, but the repair and the
 * guard prefer a better-proportioned dish over an extreme scale
 * whenever one exists. Zero for food-composed meals — the layered
 * composer has its own portion discipline.
 */
/** The meals the dish machinery composes and can move (P8,
 *  generalised P14): one anchor dish, or — since the
 *  accompaniment pass — an anchor with its base beside it. The
 *  repair scales the ANCHOR (dishes[0]); the base's fixed half
 *  serving is part of the plate, never a lever. The legacy P5–P7
 *  stack (anchor + base + side) is not this shape: stored plans
 *  carrying it are history, read and rendered, never repaired. */
function isDishMeal(meal: PlanMeal): boolean {
  if (meal.dishes.length === 1) return meal.dishes[0]!.role === "anchor";
  return (
    meal.dishes.length === 2 &&
    meal.dishes[0]!.role === "anchor" &&
    meal.dishes[1]!.role === "base"
  );
}

/** A dish-composed meal's whole plate, in kcal: the anchor plus
 *  its base when it carries one. For a single-dish meal this is
 *  the dish's own figure, exactly as before P14. */
function plateKcalOf(meal: PlanMeal): number {
  return meal.dishes.reduce((a, d) => a + d.nutrients.kcal, 0);
}

/** One dish meal's sanity term: its plate's coverage of the
 *  meal's share, priced as in `mealSanityCost`. */
function mealSanityTerm(dishKcal: number, mealKcal: number): number {
  if (mealKcal <= 0) return 0;
  const cov = dishKcal / mealKcal;
  if (cov > 1.3) return 0.5 * (cov - 1.3);
  if (cov < 0.6) return 0.5 * (0.6 - cov);
  return 0;
}

function mealSanityCost(meals: readonly PlanMeal[]): number {
  let cost = 0;
  for (const meal of meals) {
    if (!isDishMeal(meal)) continue;
    cost += mealSanityTerm(plateKcalOf(meal), meal.kcal);
  }
  return cost;
}

/** One meal's served protein: its dish plus any top-up suggestions
 *  riding on the meal. */
const mealProteinServed = (meal: PlanMeal): number =>
  meal.dishes.reduce((a, d) => a + d.nutrients.proteinG, 0) +
  meal.suggestions.reduce((a, s) => a + s.nutrients.proteinG, 0);

/** The protein-spread shares (P13; research R7/R8): each main meal
 *  should carry a real share of the day's protein guide — at least
 *  about a fifth — and no main meal should carry the day — over
 *  about 45% means the other meals were left thin, the skewed
 *  pattern the distribution studies measure against. The even
 *  split the meal shares already aim at (25 / 35 / 30) sits inside
 *  both bounds; the term prices only the excursions. */
const PROTEIN_SPREAD_MIN_SHARE = 0.2;
const PROTEIN_SPREAD_MAX_SHARE = 0.45;
/** The spread term's weight: below the band terms (1× / 2.5×), so
 *  it shapes the repair's choices among near-equal days and never
 *  outvotes landing the day itself. */
const PROTEIN_SPREAD_WEIGHT = 0.4;

/** One dish-composed main meal's spread term: how far its share of
 *  the day's protein guide sits outside the spread shares, priced
 *  relative to the bound it crossed. */
function proteinSpreadTerm(mealProteinG: number, targets: NutritionTargets): number {
  if (targets.proteinG <= 0) return 0;
  const share = mealProteinG / targets.proteinG;
  if (share < PROTEIN_SPREAD_MIN_SHARE) {
    return PROTEIN_SPREAD_WEIGHT * ((PROTEIN_SPREAD_MIN_SHARE - share) / PROTEIN_SPREAD_MIN_SHARE);
  }
  if (share > PROTEIN_SPREAD_MAX_SHARE) {
    return PROTEIN_SPREAD_WEIGHT * ((share - PROTEIN_SPREAD_MAX_SHARE) / PROTEIN_SPREAD_MAX_SHARE);
  }
  return 0;
}

/** The day's spread cost over its dish-composed main meals. Zero
 *  for food-composed meals, like the sanity term — the layered
 *  composer has its own distribution discipline, and the repair
 *  cannot move a food-composed meal anyway. A based meal counts
 *  its whole served protein (anchor + base + top-ups, as
 *  mealProteinServed already sums it). */
function proteinSpreadCost(meals: readonly PlanMeal[], targets: NutritionTargets): number {
  let cost = 0;
  for (const meal of meals) {
    if (meal.meal === "snack" || !isDishMeal(meal)) continue;
    cost += proteinSpreadTerm(mealProteinServed(meal), targets);
  }
  return cost;
}

/** The repair/guard objective: the day's band cost plus the
 *  meal-sanity term plus the protein-spread term, judged on the
 *  composed meals as they stand. */
function dayCost(meals: readonly PlanMeal[], targets: NutritionTargets): number {
  return (
    dayBandCost(dayKcalOf(meals), dayProteinOf(meals), targets) +
    mealSanityCost(meals) +
    proteinSpreadCost(meals, targets)
  );
}

/**
 * The day-total repair (P8): after every main meal has its dish,
 * walk the dish scales in quarter steps — the move that most
 * reduces the day's band cost — until the day sits inside its
 * bands or no move improves it. Moves are single steps, plus PAIRS
 * (one dish down a step, another up a step) when no single step
 * improves: scaling preserves each dish's protein density, so a
 * day that is energy-heavy but protein-tight has no improving
 * single step — every step down breaks the protein floor, every
 * step up worsens the energy — while a down/up pair trades energy
 * for protein across dishes and lands it. Only dish scales move:
 * food-composed meals and snack suggestions are constants the
 * repair reads, never levers it pulls. What the pool cannot land,
 * the repair leaves at its closest, and the plan's notes name the
 * true figure — the P3 honesty, unchanged.
 *
 * P14: a based meal (anchor + base) repairs like any dish meal,
 * over its ANCHOR's scale alone — the base's fixed half serving
 * is a constant of the plate, read in every measurement and
 * never moved. This is the pass that re-strikes the day's bands
 * with the base on the plate: an anchor composed against its
 * full share shrinks by a step or two once the base's kcal are
 * counted beside it.
 */
function repairDishScales(
  meals: PlanMeal[],
  candidateById: ReadonlyMap<string, DishCandidate>,
  targets: NutritionTargets,
): void {
  const dishMeals = meals.filter(isDishMeal);
  if (dishMeals.length === 0) return;
  interface Move {
    changes: { meal: PlanMeal; servings: number }[];
    cost: number;
  }
  const measureWith = (changes: Move["changes"]): number => {
    const saved = changes.map(({ meal }) => {
      const planDish = meal.dishes[0]!;
      return { planDish, nutrients: planDish.nutrients, servings: planDish.servings };
    });
    for (const { meal, servings } of changes) {
      const planDish = meal.dishes[0]!;
      const candidate = candidateById.get(planDish.dishId)!;
      planDish.servings = servings;
      planDish.nutrients = scaleNutrientPanel(candidate.nutrients, servings);
    }
    const next = dayCost(meals, targets);
    for (const s of saved) {
      s.planDish.nutrients = s.nutrients;
      s.planDish.servings = s.servings;
    }
    return next;
  };
  const stepped = (meal: PlanMeal, delta: number): number | null => {
    const servings = Math.round((meal.dishes[0]!.servings + delta) * 100) / 100;
    return servings < DISH_SCALE_MIN || servings > DISH_SCALE_MAX ? null : servings;
  };
  let cost = dayCost(meals, targets);
  for (let round = 0; round < 60 && cost > 0; round++) {
    let best: Move | null = null;
    const consider = (changes: Move["changes"]) => {
      const next = measureWith(changes);
      if (next < cost - 1e-9 && (best === null || next < best.cost)) {
        best = { changes, cost: next };
      }
    };
    for (const meal of dishMeals) {
      if (!candidateById.has(meal.dishes[0]!.dishId)) continue;
      for (const delta of [-DISH_SCALE_STEP, DISH_SCALE_STEP]) {
        const servings = stepped(meal, delta);
        if (servings !== null) consider([{ meal, servings }]);
      }
    }
    if (best === null && dishMeals.length > 1) {
      for (const down of dishMeals) {
        for (const up of dishMeals) {
          if (down === up) continue;
          const downServings = stepped(down, -DISH_SCALE_STEP);
          const upServings = stepped(up, DISH_SCALE_STEP);
          if (downServings === null || upServings === null) continue;
          consider([
            { meal: down, servings: downServings },
            { meal: up, servings: upServings },
          ]);
        }
      }
    }
    if (best === null) break;
    const move: Move = best;
    for (const { meal, servings } of move.changes) {
      const planDish = meal.dishes[0]!;
      const candidate = candidateById.get(planDish.dishId)!;
      planDish.servings = servings;
      planDish.nutrients = scaleNutrientPanel(candidate.nutrients, servings);
    }
    cost = move.cost;
  }
}

/** The day-aware re-pick's weight on the meal's own pick cost:
 *  the day's bands lead — they are the promise — and the pick
 *  cost (the meal's fit plus every ranking term the composer
 *  holds: scale naturalness, the learning bias, the cuisine
 *  preference, the served-yesterday penalty) breaks the ties
 *  among swaps that land the day equally well, at a weight that
 *  cannot outvote a band fix. */
const DAY_REPICK_FIT_WEIGHT = 0.3;

/**
 * The day-aware re-pick (P12): judge every candidate at every
 * scale by what the swap does to the DAY — its band cost, with
 * the swapped meal's sanity term — plus the pick cost at the
 * tie-break weight. Before P12 the guard re-picked the worst
 * meal against its own split alone, which is blind to the day's
 * actual deficit: a protein-short day re-picked its worst meal
 * toward the meal's protein share even when another slot — or a
 * denser dish in the same slot — was where the day's protein
 * could actually be bought. Selection over trimming, judged at
 * the level the promise is made.
 */
/** A day's out-of-band excesses, per band — the components of
 *  `dayBandCost` before their weights. Zero inside the band. */
function bandExcesses(
  kcal: number,
  proteinG: number,
  targets: NutritionTargets,
): { kcal: number; protein: number } {
  const kcalExcess = Math.max(0, Math.abs(kcal - targets.kcal) / targets.kcal - DAY_KCAL_BAND);
  let proteinExcess = 0;
  if (proteinG < DAY_PROTEIN_MIN * targets.proteinG) {
    proteinExcess = (DAY_PROTEIN_MIN * targets.proteinG - proteinG) / targets.proteinG;
  } else if (proteinG > DAY_PROTEIN_MAX * targets.proteinG) {
    proteinExcess = (proteinG - DAY_PROTEIN_MAX * targets.proteinG) / targets.proteinG;
  }
  return { kcal: kcalExcess, protein: proteinExcess };
}

function bestDayAwarePick(
  cands: readonly DishCandidate[],
  meal: PlanMeal,
  meals: readonly PlanMeal[],
  targets: NutritionTargets,
  opts: DishPickOpts,
  day: string,
  ordered: readonly DishCandidate[],
): { candidate: DishCandidate; servings: number; judge: number; base: PlanDish | null } | null {
  const current = meal.dishes[0]!;
  const split: MealSplit = { meal: meal.meal, kcal: meal.kcal, proteinG: meal.proteinG };
  const restKcal = dayKcalOf(meals) - current.nutrients.kcal;
  const restProtein = dayProteinOf(meals) - current.nutrients.proteinG;
  const otherSanity =
    mealSanityCost(meals) - mealSanityTerm(current.nutrients.kcal, meal.kcal);
  /* P13: the spread term, split the same way — the other meals'
   *  spread is a constant of the swap; this meal's is re-judged on
   *  the candidate's panel (its top-up suggestions ride along,
   *  exactly as mealProteinServed counts them). */
  const otherSpread =
    proteinSpreadCost(meals, targets) - proteinSpreadTerm(mealProteinServed(meal), targets);
  const mealTopUpProtein = meal.suggestions.reduce((a, s) => a + s.nutrients.proteinG, 0);
  /* The Pareto guard: a re-pick may trade freely INSIDE the
     bands, but it may never deepen either band's excess — a
     protein fix bought with energy, or an energy fix bought
     with protein, is how the pre-P12 guard's blind re-picks
     traded one promise against the other. */
  const currentExcess = bandExcesses(dayKcalOf(meals), dayProteinOf(meals), targets);
  let best: { candidate: DishCandidate; servings: number; judge: number; base: PlanDish | null } | null =
    null;
  for (const candidate of cands) {
    /* P14: the candidate is judged as the plate it would actually
     *  be served as — a gravy lunch/dinner candidate carries its
     *  accompaniment (fixed serving, candidate-independent), so
     *  the base's nutrients ride in every total below, and the
     *  base the judge counted is the base the swap serves. */
    const base = accompanimentFor(candidate.dish, meal.meal, ordered);
    const baseKcal = base?.nutrients.kcal ?? 0;
    const baseProtein = base?.nutrients.proteinG ?? 0;
    const panels = scaledPanels(candidate);
    for (let i = 0; i < DISH_SCALE_STEPS.length; i++) {
      const servings = DISH_SCALE_STEPS[i]!;
      const panel = panels[i]!;
      const plateKcal = panel.kcal + baseKcal;
      const plateProtein = panel.proteinG + baseProtein;
      const excess = bandExcesses(restKcal + plateKcal, restProtein + plateProtein, targets);
      if (
        excess.kcal > currentExcess.kcal + 1e-9 ||
        excess.protein > currentExcess.protein + 1e-9
      ) {
        continue;
      }
      const judge =
        dayBandCost(restKcal + plateKcal, restProtein + plateProtein, targets) +
        otherSanity +
        mealSanityTerm(plateKcal, meal.kcal) +
        otherSpread +
        proteinSpreadTerm(plateProtein + mealTopUpProtein, targets) +
        DAY_REPICK_FIT_WEIGHT * dishPickCost(candidate, panel, servings, split, opts, day);
      if (best === null || judge < best.judge - 1e-9) {
        best = { candidate, servings, judge, base };
      }
    }
  }
  return best;
}

/**
 * The day guard (P8, re-pick P12): repair the scales; while the
 * day still sits outside its bands and attempts remain, re-pick
 * the dish meal whose swap most improves the DAY (see
 * bestDayAwarePick), then repair again. This is what lets the
 * pick band stay generous: variety is tried first, and the day's
 * totals — the numbers the person actually judges the plan by —
 * are enforced after, at the level where they are defined.
 * Bounded at four attempts; a swap is made only when it improves
 * the judged day, so the guard never trades a closer day for a
 * worse one. A day the pool genuinely cannot land stays at its
 * closest, and the plan's notes name the true figure.
 *
 * P14: a based meal is never re-picked — swapping its anchor
 * would re-open the accompaniment question (is the new anchor
 * still a gravy dish, and which base fits it?) inside a pass
 * whose discipline is totals. Its anchor's scale still repairs
 * on every attempt, and the day's other meals re-pick around
 * it; the loop below keeps its single-dish shape test for
 * exactly this reason. The converse is accompaniment-aware: a
 * re-pick INTO a gravy anchor is judged as the whole plate
 * (anchor + base) and serves the base it was judged with, so a
 * swap can complete a plate but never strip one bare.
 */
function enforceDayBands(
  meals: PlanMeal[],
  ordered: readonly DishCandidate[],
  candidateById: ReadonlyMap<string, DishCandidate>,
  targets: NutritionTargets,
  day: string,
  opts: DishPickOpts,
): void {
  for (let attempt = 0; attempt < 4; attempt++) {
    repairDishScales(meals, candidateById, targets);
    if (dayCost(meals, targets) <= 0) return;
    let bestSwap: {
      meal: PlanMeal;
      candidate: DishCandidate;
      servings: number;
      judge: number;
      base: PlanDish | null;
    } | null = null;
    for (const meal of meals) {
      if (meal.dishes.length !== 1) continue;
      /* P13: the snack's dish is the snack slot's own composition
       *  (shake / snack / breakfast categories) — the guard never
       *  re-picks it into a main dish; its scale still repairs. */
      if (meal.meal === "snack") continue;
      const current = meal.dishes[0]!;
      const split: MealSplit = { meal: meal.meal, kcal: meal.kcal, proteinG: meal.proteinG };
      const currentCandidate = candidateById.get(current.dishId);
      const currentPickCost = currentCandidate
        ? dishPickCost(currentCandidate, current.nutrients, current.servings, split, opts, day)
        : mealFitCost(current.nutrients, split);
      const currentJudge = dayCost(meals, targets) + DAY_REPICK_FIT_WEIGHT * currentPickCost;
      const usedElsewhere = new Set(
        meals.filter((m) => m !== meal).flatMap((m) => m.dishes.map((d) => d.dishId)),
      );
      const cands = slotCandidates(ordered, meal.meal, usedElsewhere).filter(
        (c) => c.dish.id !== current.dishId,
      );
      const pick = bestDayAwarePick(cands, meal, meals, targets, opts, day, ordered);
      if (!pick) continue;
      if (pick.judge >= currentJudge - 1e-9) continue;
      if (bestSwap === null || pick.judge < bestSwap.judge - 1e-9) {
        bestSwap = {
          meal,
          candidate: pick.candidate,
          servings: pick.servings,
          judge: pick.judge,
          base: pick.base,
        };
      }
    }
    if (bestSwap === null) return;
    /* P14: the swap serves the plate the judge counted — the new
       anchor, plus its accompaniment when it earns one. */
    const anchor = toPlanDish(bestSwap.candidate, "anchor", bestSwap.servings);
    bestSwap.meal.dishes = bestSwap.base ? [anchor, bestSwap.base] : [anchor];
  }
}

/**
 * The hard pattern post-condition (P8): every dish the plan serves
 * must suit the person's dietary pattern — re-verified here, on the
 * composed meals, against `dishPatterns` itself, not trusted from
 * the pool's construction. Returns the names of any meals whose
 * dish violates the pattern; the caller replaces those meals with
 * the layered food composition. With the pool's own gate upstream
 * this cannot fire — it exists so that "cannot fire" is a checked
 * property of every generated plan, not an assumption.
 */
function patternViolations(
  meals: readonly PlanMeal[],
  dishById: ReadonlyMap<string, Dish>,
  pattern: PlanPattern | null,
): string[] {
  if (pattern === null) return [];
  const bad: string[] = [];
  for (const meal of meals) {
    for (const planDish of meal.dishes) {
      const dish = dishById.get(planDish.dishId);
      if (!dish || !dishPatterns(dish).includes(pattern)) bad.push(meal.meal);
    }
  }
  return bad;
}

/* ------------------------------ P5 top-ups -------------------------------- */

/** At most this many top-up foods join one meal — they complete a
 *  day; they never become the meal. */
const MAX_TOPUPS_PER_MEAL = 3;

/**
 * Add one top-up food to a meal, sized toward the aim inside the
 * food's own portion cap — the composer's caps bind top-ups exactly
 * as they bind composition — and inside the day's remaining energy
 * room: a top-up that would push the day past its guide is sized
 * down to the room or not added at all. Protein mode draws on the
 * protein-bearing dairy and egg foods and (P11) the protein
 * powders, ranked by protein density
 * (the P3 band idiom: within 80% of the best density, the day's
 * rotation decides; beyond the band, density decides) — at a
 * high-protein guide, protein bought at 17 g/100 kcal and protein
 * bought at 8 are different purchases. Energy mode draws on
 * milk/curd and nuts/seeds. Unused-today first, the whole egg ahead
 * of its parts. Returns false when nothing honest can be added.
 *
 * P13 (research R24): the top-up is the LAST step of the closing
 * discipline, not the first — the day guard has already scaled
 * the protein dish (step 1) and re-picked it (step 2), and the
 * snack slot has served its protein dish (step 3) before this
 * pass runs. Within the pass, whole foods are tried before the
 * protein powders on every call: a powder is a loose supplement
 * top-up, and it closes a gap only when no whole food the pool
 * allows can. (The P12 gap scoop is powder-only by construction
 * and stays what it is — the over-guide corner's last resort,
 * invoked through its own flag below.)
 */
function addOneTopUp(
  ctx: ComposeContext,
  meal: PlanMeal,
  aim: { kcal?: number; proteinG?: number },
  roomKcal: number,
  opts?: { powderScoop?: boolean; leanEnergy?: boolean },
): boolean {
  if (roomKcal < 25) return false;
  /* A main meal never grows past ten suggestions (P12): the plate
     cap trims composition to eight, and top-ups complete a day —
     they do not stack a meal into a spreadsheet. The gap scoop
     made the eleventh item reachable on item-heavy days; the
     ceiling lives here, at the one choke point every top-up
     passes through. */
  if (meal.meal !== "snack" && meal.suggestions.length >= 10) return false;
  const inMeal = new Set(meal.suggestions.map((s) => s.foodId));
  const proteinMode = aim.proteinG !== undefined;
  const eligibleAll = ctx.ordered.filter((food) => {
    if (inMeal.has(food.id)) return false;
    const group = groupOf(food);
    if (proteinMode) {
      /* Egg parts are excluded outright: a top-up is a food a person
         eats (a yogurt, an egg), never a separated component — the
         P3 parts principle, held at the top-up layer too. P11: the
         protein powders join this pool — a powder is a top-up food
         by nature (it closes a protein gap; it is never a meal),
         and at 0.14–0.16 g of protein per kcal it is the densest
         honest closing the set offers. The pool's pattern gate has
         already judged it (a vegan's pool holds no whey). */
      return (
        ((group === "dairy" || group === "eggs") &&
          proteinKindOf(food) !== null &&
          !isEggPart(food)) ||
        isProteinPowder(food)
      );
    }
    return isMilkOrCurd(food) || group === "nuts_seeds";
  });
  /* The gap scoop (P12) is powder-only by construction: the caller
     passes the scoop's own kcal cap as roomKcal, and the protein-mode
     sizing below caps the portion at it. */
  const eligible = opts?.powderScoop ? eligibleAll.filter((f) => isProteinPowder(f)) : eligibleAll;
  const density = (food: Food): number =>
    food.per100g.kcal > 0 ? food.per100g.proteinG / food.per100g.kcal : 0;
  const bestDensity = eligible.reduce((max, f) => Math.max(max, density(f)), 0);
  const candidates = eligible.sort((a, b) => {
    if (proteinMode) {
      /* Protein-first (P6): density decides outright, not just beyond
         the band — after a shortfall log, the densest protein the
         caps allow is the honest purchase. The used/egg-part order
         below still breaks the ties. */
      if (ctx.proteinFirst && density(a) !== density(b)) return density(b) - density(a);
      const bandA = density(a) >= 0.8 * bestDensity ? 0 : 1;
      const bandB = density(b) >= 0.8 * bestDensity ? 0 : 1;
      if (bandA !== bandB) return bandA - bandB;
      if (bandA === 1 && density(a) !== density(b)) return density(b) - density(a);
    }
    if (!proteinMode && opts?.leanEnergy) {
      /* Lean energy (P12): when the day's protein already meets
         its guide, energy is bought with the least protein
         attached — the energy pool's incidental protein (nuts and
         seeds carry 0.03–0.06 g per kcal) is what pushed
         protein-long days over their band while the protein trim
         sat blocked at the energy floor. Unused still first;
         density ascending breaks the rest. */
      const usedDelta = Number(ctx.used.has(a.id)) - Number(ctx.used.has(b.id));
      if (usedDelta !== 0) return usedDelta;
      return density(a) - density(b);
    }
    return (
      Number(ctx.used.has(a.id)) - Number(ctx.used.has(b.id)) ||
      Number(isEggPart(a)) - Number(isEggPart(b))
    );
  });
  /* P13: whole foods before powders — the ranked order above holds
   *  within each class, and the classes are tried in R24's order.
   *  The gap scoop (powderScoop) is powder-only already and skips
   *  the partition. */
  const ordered =
    proteinMode && !opts?.powderScoop
      ? [
          ...candidates.filter((f) => !isProteinPowder(f)),
          ...candidates.filter((f) => isProteinPowder(f)),
        ]
      : candidates;
  for (const food of ordered) {
    let portion: SizedPortion | null;
    if (proteinMode) {
      /* A powder's cap is its own (the scoop cap); every other
         top-up food is capped by its protein kind as before. */
      const cap = isProteinPowder(food)
        ? CAP_PROTEIN_POWDER_G
        : proteinCapG(food, proteinKindOf(food)!);
      portion = sizedPortion(food, aim, cap);
      if (portion && portion.nutrients.kcal > roomKcal) {
        portion = sizedPortion(food, { kcal: roomKcal }, cap);
      }
      if (portion && isProteinPowder(food) && portion.grams < 15) {
        /* A powder is served as a scoop, never a dusting (P12):
           gap-sizing a small remainder produced 10 g portions —
           a third of a scoop nobody measures. The floor is one
           small scoop (15 g); if that cannot fit the energy room
           honestly, the candidate is skipped, not shrunk. */
        const scoop = sizedPortion(food, { proteinG: (food.per100g.proteinG * 15) / 100 }, cap);
        portion = scoop && scoop.nutrients.kcal <= roomKcal ? scoop : null;
      }
      if (portion && portion.nutrients.proteinG < 3) continue;
    } else {
      const cap = isMilkOrCurd(food) ? CAP_FINISHING_DAIRY_G : CAP_NUTS_G;
      portion = sizedPortion(food, { kcal: Math.min(aim.kcal ?? 0, roomKcal) }, cap);
      if (portion && portion.nutrients.kcal < 40) continue;
    }
    if (!portion) continue;
    meal.suggestions.push(recordSuggestion(ctx, food, portion, "topup"));
    return true;
  }
  return false;
}

/**
 * The top-up pass (P5): when dishes alone leave the day short, a few
 * simple foods close the gap — protein first (toward the full guide,
 * meal by meal from the largest split deficit), then energy (toward
 * the reconciliation trigger, after which `reconcileEnergy` fine-tunes
 * as it always has). Top-ups are sized inside the same portion caps
 * as composed foods, and what they cannot close, the day's notes name
 * with its true figure — the P3 honesty, unchanged.
 */
function addTopUps(
  ctx: ComposeContext,
  meals: PlanMeal[],
  targets: NutritionTargets,
  skipEnergyTopUps = false,
): void {
  const mains = meals.filter((m) => m.meal !== "snack");
  const topUpCount = (m: PlanMeal) => m.suggestions.filter((s) => s.layer === "topup").length;
  const byDeficit = (key: (m: PlanMeal) => number) =>
    mains.filter((m) => topUpCount(m) < MAX_TOPUPS_PER_MEAL).sort((a, b) => key(b) - key(a));

  /* Protein top-ups may spend the day up to its note band (+5%) —
     the same tolerance the day's energy is judged at — and no
     further: protein bought past the guide is not closing, it is
     overshooting, and the shortfall note exists for what the room
     cannot buy. */
  for (let round = 0; round < 12 && dayProteinOf(meals) < targets.proteinG; round++) {
    const room = (1 + ENERGY_NOTE_BAND) * targets.kcal - dayKcalOf(meals);
    if (room < 25) break;
    const gap = targets.proteinG - dayProteinOf(meals);
    const ordered = byDeficit(
      (m) =>
        m.proteinG -
        (m.suggestions.reduce((a, s) => a + s.nutrients.proteinG, 0) +
          m.dishes.reduce((a, d) => a + d.nutrients.proteinG, 0)),
    );
    let added = false;
    for (const meal of ordered) {
      if (addOneTopUp(ctx, meal, { proteinG: gap }, room)) {
        added = true;
        break;
      }
    }
    if (!added) break;
  }

  /* P12 — the gap scoop. The loop above stops when the day has no
     energy room left, and a day can be protein-short with no room
     at all when the composed day already runs over its guide: the
     guideline floors and layers add up past a small guide whose
     protein demand is dense (the owner's own live day: ~1,616 kcal
     served on a ~1,350 guide, protein ~8 g short, no top-up
     served). The room rule exists to stop top-ups overshooting the
     guide; judged on the ADDITION rather than the day's total, one
     gap-sized powder portion — the densest protein in the set —
     whose own energy stays within 5% of the guide closes the
     protein gap for a few dozen kcal the day's note already names.
     At most two scoops (one is the usual case), powder only, each
     sized to the remaining gap and capped at 5% of the guide's
     energy, the pair together at 8%. When even that cannot fire
     (no powder the pool allows, or the meal caps are full), the
     protein note says why nothing was added. */
  if (dayProteinOf(meals) < targets.proteinG) {
    const room = (1 + ENERGY_NOTE_BAND) * targets.kcal - dayKcalOf(meals);
    if (room < 25) {
      const scoopCapKcal = Math.max(30, Math.round(0.05 * targets.kcal));
      const scoopBudgetKcal = Math.round(0.08 * targets.kcal);
      let scoops = 0;
      let scoopKcal = 0;
      while (scoops < 2 && dayProteinOf(meals) < targets.proteinG) {
        const ordered = byDeficit(
          (m) =>
            m.proteinG -
            (m.suggestions.reduce((a, s) => a + s.nutrients.proteinG, 0) +
              m.dishes.reduce((a, d) => a + d.nutrients.proteinG, 0)),
        );
        let added = false;
        for (const meal of ordered) {
          const beforeKcal = dayKcalOf(meals);
          if (
            addOneTopUp(
              ctx,
              meal,
              { proteinG: targets.proteinG - dayProteinOf(meals) },
              scoopCapKcal,
              { powderScoop: true },
            )
          ) {
            scoopKcal += dayKcalOf(meals) - beforeKcal;
            added = true;
            break;
          }
        }
        if (!added) break;
        scoops++;
        if (scoopKcal > scoopBudgetKcal) break;
      }
    }
  }

  /* The energy round is skipped whole on an energy-overshoot log
     (P6): the person's logged days already run over the guide, so the
     plan does not spend top-ups pushing a dish day up toward it —
     reconciliation still fine-tunes what the dishes themselves left,
     and the day's notes judge the result honestly either way. */
  for (
    let round = 0;
    round < 12 && !skipEnergyTopUps && dayKcalOf(meals) < ENERGY_ADD_TRIGGER * targets.kcal;
    round++
  ) {
    const room = targets.kcal - dayKcalOf(meals);
    if (room < 25) break;
    const ordered = byDeficit(
      (m) =>
        m.kcal -
        (m.suggestions.reduce((a, s) => a + s.nutrients.kcal, 0) +
          m.dishes.reduce((a, d) => a + d.nutrients.kcal, 0)),
    );
    let added = false;
    for (const meal of ordered) {
      if (
        addOneTopUp(ctx, meal, { kcal: Math.min(room, meal.kcal) }, room, {
          leanEnergy: dayProteinOf(meals) >= targets.proteinG,
        })
      ) {
        added = true;
        break;
      }
    }
    if (!added) break;
  }
}

/* ------------------------------ P11 day start ----------------------------- */

/** One glass of water: 250 ml — the measure the whole app uses
 *  (the water tracker's glass in `health/body.ts`, the voice
 *  commands' `GLASS_ML`). The morning element pours one glass. */
const WAKE_WATER_ML = 250;

/** A water target is a target only as a sane, finite figure. The
 *  body engine clamps its own to 1500–4500 ml; the band here is
 *  wider so a caller-supplied figure is judged, not presumed. */
function validWaterTargetMl(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value < 100 || value > 10000) return null;
  return Math.round(value);
}

/**
 * The day's start (P11): a glass of water on waking, and — when the
 * day's water target is known — the rest of the target spread over
 * the day's meals, summing EXACTLY to it (splitUnits reconciles the
 * millilitres as it reconciles the kilocalories). Without a known
 * target the morning glass still stands — it is one glass, the
 * app's own measure — and no schedule is invented.
 */
function dayStartFor(
  waterTargetMl: number | null,
  meals: readonly PlanMeal[],
): { morning: PlanMorning; hydration?: PlanHydration } {
  const wakeMl = waterTargetMl !== null ? Math.min(WAKE_WATER_ML, waterTargetMl) : WAKE_WATER_ML;
  const morning: PlanMorning = { waterMl: wakeMl };
  if (waterTargetMl === null || waterTargetMl <= wakeMl || meals.length === 0) {
    return { morning };
  }
  const rest = waterTargetMl - wakeMl;
  const parts = splitUnits(
    rest,
    meals.map(() => 1 / meals.length),
  );
  const perMeal = meals
    .map((m, i) => ({ meal: m.meal, ml: parts[i]! }))
    .filter((p) => p.ml > 0);
  return {
    morning,
    hydration: { targetMl: waterTargetMl, wakeMl, perMeal, totalMl: waterTargetMl },
  };
}

/* ----------------------------- P12 day timeline ---------------------------- */

/** A clock time as the sleep log states it: "HH:MM", 24-hour. */
const CLOCK_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function clockToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToClock(total: number): string {
  const wrapped = ((Math.round(total) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const round5Min = (mins: number): number => Math.round(mins / 5) * 5;

/** The awake span a clock anchor must span to be believed: under
 *  nine hours awake, the fixed points of a four-sitting day cannot
 *  keep their spacing; over nineteen, the "day" is not a day. An
 *  anchor outside the span is not argued with — the timeline falls
 *  back to relative anchors, exactly as when no clock is known. */
const MIN_AWAKE_MINUTES = 9 * 60;
const MAX_AWAKE_MINUTES = 19 * 60;

/** Eating items keep at least this much room between them. */
const MIN_EATING_GAP_MINUTES = 90;
/** Breakfast follows waking by this much — time to be up and
 *  about; the waking glass itself is at the wake item. */
const BREAKFAST_AFTER_WAKE_MINUTES = 45;
/** Dinner ends the eating day this long before bed. */
const DINNER_BEFORE_BED_MINUTES = 150;
/** The last eating item of any kind keeps at least this much
 *  room before the sleep anchor. */
const LAST_EATING_BEFORE_BED_MINUTES = 120;
/** The wind-down sits this long before bed. */
const WIND_DOWN_BEFORE_BED_MINUTES = 45;

/**
 * Validate the caller's clock anchor: the person's usual wake and
 * bed times from their sleep log. Returns the window in minutes —
 * wake on the morning line, bed after it (a bed past midnight
 * counts into the next day) — or null when the times are absent,
 * malformed, or span an awake window no day can be scheduled in.
 * Null is not an error: it is the relative day.
 */
function dayAnchorFor(
  wakeTime: string | null | undefined,
  bedTime: string | null | undefined,
): { wake: number; bed: number } | null {
  if (!wakeTime || !bedTime) return null;
  if (!CLOCK_TIME_RE.test(wakeTime) || !CLOCK_TIME_RE.test(bedTime)) return null;
  const wake = clockToMinutes(wakeTime);
  let bed = clockToMinutes(bedTime);
  if (bed <= wake) bed += 1440;
  const awake = bed - wake;
  if (awake < MIN_AWAKE_MINUTES || awake > MAX_AWAKE_MINUTES) return null;
  return { wake, bed };
}

/** The snack's name from where it lands in the day: a position in
 *  the day's structure, stated as the part of the day it falls in.
 *  On a relative day the position comes from the same scheduling
 *  run over a nominal frame — the words describe position, never
 *  a clock the person did not give. */
function snackLabelAt(minutes: number): string {
  const clock = ((minutes % 1440) + 1440) % 1440;
  if (clock < 12 * 60) return "Mid-morning snack";
  if (clock < 17 * 60) return "Afternoon snack";
  return "Evening snack";
}

const MEAL_TIMELINE_LABEL: Record<Exclude<Meal, "snack">, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

/**
 * The day's timeline (P12): the composed meals laid out from
 * waking to sleep. The schedule is presentation — it reads the
 * finished plan's meals and places them; it adds no food, moves
 * no portion, and changes no total.
 *
 * Placement, on the anchor's window (a nominal 07:00–23:00 frame
 * stands in when the day is relative — used only to order the
 * items and name the snack's position, never shown as a time):
 * breakfast 45 minutes after waking; dinner 2½ hours before bed;
 * lunch at 44% of the window (a third in, when there is no
 * breakfast to precede it); the snack at the midpoint of the
 * widest gap that can hold it — between two eating items, after
 * waking, or after the last main — keeping 90 minutes from its
 * neighbours and two hours clear of bed; the wind-down 45 minutes
 * before bed. Derived times round to five minutes: the plan
 * schedules a day, it does not pretend to the minute.
 *
 * P14: under the person's "morning" snack preference the snack
 * takes the breakfast→lunch gap instead, when that gap can hold
 * it by the same 90-minute rule; the widest-gap placement above
 * is the default and the fallback, unchanged.
 */
function dayTimelineFor(
  meals: readonly PlanMeal[],
  anchor: { wake: number; bed: number } | null,
  snackPlacement: SnackPlacement = "widest_gap",
): PlanTimeline {
  const wake = anchor?.wake ?? 7 * 60;
  const bed = anchor?.bed ?? 23 * 60;
  const awake = bed - wake;
  const present = new Set(meals.map((m) => m.meal));
  const mains = (["breakfast", "lunch", "dinner"] as const).filter((m) => present.has(m));

  const times = new Map<Meal, number>();
  if (present.has("breakfast")) times.set("breakfast", wake + BREAKFAST_AFTER_WAKE_MINUTES);
  if (present.has("dinner")) times.set("dinner", bed - DINNER_BEFORE_BED_MINUTES);
  if (present.has("lunch")) {
    let lunch = present.has("breakfast")
      ? wake + round5Min(awake * 0.44)
      : wake + Math.max(150, round5Min(awake * 0.32));
    if (present.has("breakfast")) {
      lunch = Math.max(lunch, times.get("breakfast")! + MIN_EATING_GAP_MINUTES);
    }
    if (present.has("dinner")) {
      lunch = Math.min(lunch, times.get("dinner")! - MIN_EATING_GAP_MINUTES);
    }
    times.set("lunch", lunch);
  }
  if (mains.length === 1 && mains[0] !== "dinner" && !present.has("breakfast")) {
    /* A lunch-only day eats at the day's middle, not its start. */
    times.set(mains[0]!, wake + round5Min(awake * 0.45));
  }

  let snackAt: number | null = null;
  if (present.has("snack")) {
    const eating = mains.map((m) => times.get(m)!).sort((a, b) => a - b);
    interface Segment {
      from: number;
      to: number;
      /** Both ends are eating items (or the day's own bounds). */
      length: number;
    }
    const segments: Segment[] = [];
    if (eating.length > 0) {
      segments.push({ from: wake + BREAKFAST_AFTER_WAKE_MINUTES, to: eating[0]!, length: eating[0]! - (wake + BREAKFAST_AFTER_WAKE_MINUTES) });
      for (let i = 0; i + 1 < eating.length; i++) {
        segments.push({ from: eating[i]!, to: eating[i + 1]!, length: eating[i + 1]! - eating[i]! });
      }
      segments.push({
        from: eating[eating.length - 1]!,
        to: bed - LAST_EATING_BEFORE_BED_MINUTES,
        length: bed - LAST_EATING_BEFORE_BED_MINUTES - eating[eating.length - 1]!,
      });
    }
    /* A segment holds the snack when its midpoint keeps the
       eating gap from both neighbours. The widest such segment
       wins; if none qualifies (a window at the span's floor with
       every main placed), the widest segment overall takes it —
       the spacing assertion in the verification matrix judges the
       result, so a construction miss would surface, not ship. */
    const holds = (s: Segment): boolean => {
      const mid = (s.from + s.to) / 2;
      return mid - s.from >= MIN_EATING_GAP_MINUTES && s.to - mid >= MIN_EATING_GAP_MINUTES;
    };
    const widest = (list: Segment[]): Segment | null =>
      list.reduce<Segment | null>(
        (best, s) => (best === null || s.length > best.length ? s : best),
        null,
      );
    /* P14: the person's snack-placement preference. "morning"
       asks for the breakfast→lunch gap itself: when both meals
       are placed and that gap holds the snack (its midpoint
       keeps the same 90 minutes from both neighbours), the
       snack sits there, whatever the wider gaps are doing.
       When the gap cannot hold it — a short morning, a missing
       breakfast or lunch — the widest-gap rule decides, exactly
       as it does by default: the preference is honoured where
       the day allows it and never forces a spacing the day's
       own rules forbid. */
    let chosen: Segment | null = null;
    if (snackPlacement === "morning" && times.has("breakfast") && times.has("lunch")) {
      const gap: Segment = {
        from: times.get("breakfast")!,
        to: times.get("lunch")!,
        length: times.get("lunch")! - times.get("breakfast")!,
      };
      if (holds(gap)) chosen = gap;
    }
    chosen ??= widest(segments.filter(holds)) ?? widest(segments);
    if (chosen) snackAt = round5Min((chosen.from + chosen.to) / 2);
  }

  const items: { at: number; item: PlanTimelineItem }[] = [];
  const clock = (at: number): string | null => (anchor ? minutesToClock(at) : null);
  items.push({ at: wake, item: { kind: "wake", time: clock(wake), label: "On waking" } });
  for (const meal of mains) {
    const at = times.get(meal)!;
    items.push({
      at,
      item: { kind: "meal", meal, time: clock(at), label: MEAL_TIMELINE_LABEL[meal] },
    });
  }
  if (snackAt !== null) {
    items.push({
      at: snackAt,
      item: { kind: "meal", meal: "snack", time: clock(snackAt), label: snackLabelAt(snackAt) },
    });
  }
  const windDownAt = bed - WIND_DOWN_BEFORE_BED_MINUTES;
  items.push({ at: windDownAt, item: { kind: "wind_down", time: clock(windDownAt), label: "Wind down" } });
  items.push({ at: bed, item: { kind: "sleep", time: clock(bed), label: "Bedtime" } });
  items.sort((a, b) => a.at - b.at);
  return { anchor: anchor ? "sleep_log" : "relative", items: items.map((e) => e.item) };
}

/* ------------------------------- generation -------------------------------- */

export interface PlanGenerationInput {
  profile: HealthProfile;
  safety: SafetyAssessment;
  /** `targetsFor(profile, safety, day)` — the safety-gated engine outcome. */
  gatedOutcome: BodyTargetsOutcome;
  /** Targets from the legacy body profile (the Nutrition tab's fallback),
   *  already adapted through `nutritionTargetsFromBodyTargets`. Consulted
   *  only when the gated path refuses for completeness or absence. */
  fallbackTargets: NutritionTargets | null;
  /** The suggestion pool: the user's own foods first, then the USDA
   *  reference set. Eligibility is re-checked inside regardless. */
  foods: readonly Food[];
  /** The dish library (P5): when supplied, main meals are composed
   *  dish-first and foods serve as top-ups and the per-slot fallback.
   *  Absent or empty, composition is the layered food composition
   *  alone — the behaviour every plan before P5 was built with. */
  dishes?: readonly Dish[];
  /** The person's food log (P6): when supplied, the recent logged
   *  days bias composition (see planAdaptation) — protein-first
   *  selection after a protein-shortfall log, no energy top-ups
   *  after an energy-overshoot log. Targets are never touched.
   *  Absent, or too little logged, composition is exactly P5's. */
  recentLog?: readonly LogEntry[];
  /** The currently stored plan (P7): the learning pass judges it for
   *  dishes it served on a completed day that the log never took up,
   *  and for the portions it serves, against the portions actually
   *  logged. Absent, those two signals simply do not speak. */
  storedPlan?: DailyPlan | null;
  /** A user-confirmed target adjustment in kcal (P7, see
   *  targetAdjustment.ts): applied to the resolved energy target
   *  AFTER the engine and the fallback have spoken, before the
   *  inputs snapshot — so the plan's targets stay reproducible from
   *  stored inputs, and confirming or clearing one makes an existing
   *  plan stale by name ("your targets"). Protein is never adjusted.
   *  Out-of-range results are refused, never clamped silently. */
  targetAdjustmentKcal?: number;
  /** The person's switched-on Condition Modes (System 14, see
   *  lib/modes): user-chosen guardrails judged inside the dish pool,
   *  on top of the pattern and budget gates. Absent or empty, the
   *  pool is exactly what it was before modes existed. Like the
   *  recent log, modes shape selection only — never the targets. */
  activeModes?: readonly ModeId[];
  /** The day's water target in ml from the FALLBACK targets' source
   *  (the Trackers body profile — `bodyTargets().waterMl`), consulted
   *  when the plan's targets come from that fallback. When the gated
   *  Assessment path speaks, its own outcome carries the figure and
   *  outranks this one: the plan's hydration always comes from the
   *  same source as its targets. Absent or invalid, the plan still
   *  opens with its morning glass; it simply carries no schedule. */
  waterMl?: number | null;
  /** The person's usual wake and bed times ("HH:MM") from their
   *  own sleep log (P12) — the median window the trackers compute
   *  from their logged nights. When both are present and span a
   *  schedulable day, the plan's timeline carries clock times;
   *  absent or unusable, the timeline is anchored relatively and
   *  shows no times at all. Scheduling only — the anchor never
   *  touches a target, a split, or a portion. */
  wakeTime?: string | null;
  bedTime?: string | null;
  /** The person's snack-placement preference (P14): "widest_gap"
   *  (the default — the P12 widest-gap rule, unchanged) or
   *  "morning" (the snack sits in the breakfast→lunch gap when
   *  that gap can hold it). Scheduling only, like the day anchor:
   *  it moves no target, split or portion — only where the snack
   *  lands on the timeline. Recorded on the inputs snapshot on
   *  the anchor's precedent, so changing it names the stored plan
   *  stale ("where your snack sits") and the person's own
   *  regenerate tap re-composes under it. Absent, the default
   *  applies and the output is the pre-P14 composer's exactly. */
  snackPlacement?: SnackPlacement;
  /** The day the plan is for. */
  day: string;
  now: string;
  id?: string;
}

const MISSING_LABEL: Record<string, string> = {
  goal: "your goal",
  ageYears: "your age",
  height: "your height",
  weight: "your weight",
  activity: "your activity level",
  safetyAnswers: "your safety answers in the Assessment",
  body: "your body numbers",
};

/** Missing-input names in the order a person would fix them. */
function missingNames(profile: HealthProfile, extra: readonly string[]): string[] {
  const wanted = new Set<string>(extra);
  if (profile.goal === null) wanted.add("goal");
  for (const field of missingBodyFields(profile)) wanted.add(field);
  const ordered = [
    "goal",
    "ageYears",
    "height",
    "weight",
    "activity",
    "safetyAnswers",
    "body",
  ].filter((key) => wanted.has(key));
  return ordered.map((key) => MISSING_LABEL[key]!);
}

function validTargets(targets: NutritionTargets | null): NutritionTargets | null {
  if (!targets) return null;
  if (!Number.isFinite(targets.kcal) || !Number.isFinite(targets.proteinG)) return null;
  if (targets.kcal <= 0 || targets.proteinG <= 0) return null;
  return targets;
}

export function generatePlan(input: PlanGenerationInput): PlanOutcome {
  const { profile, safety } = input;

  /* 1. Safety first, always. A substantive block refuses the plan in the
        classifier's own words; an absence-only block is an information
        gap and falls through to the same fallback the Nutrition tab
        uses — never to a plan built over a real finding. */
  const blockingIds = safety.findings.filter((f) => f.blocking).map((f) => f.ruleId);
  if (safety.blocking && hasSubstantiveBlock(blockingIds)) {
    return {
      ok: false,
      refusal: {
        kind: "safety_blocked",
        classification: safety.classification,
        requiresProfessionalReview: safety.requiresProfessionalReview,
        findings: safety.findings
          .filter((f) => f.blocking && !ABSENCE_BLOCK_RULE_IDS.has(f.ruleId))
          .map((f) => ({ ruleId: f.ruleId, summary: f.summary })),
      },
    };
  }

  /* 2 + 3. Targets: the gated engine first, the body-profile fallback
        second — the Nutrition tab's exact resolution order. */
  let targets: NutritionTargets | null = null;
  let targetsSource: DailyPlan["targetsSource"] = "assessment";
  if (input.gatedOutcome.ok) {
    targets = validTargets(nutritionTargetsFromOutcome(input.gatedOutcome));
  }
  if (!targets) {
    targets = validTargets(input.fallbackTargets);
    targetsSource = "body_profile";
  }
  if (!targets || profile.goal === null) {
    const extra: string[] = [];
    if (!targets && blockingIds.includes("safety_answers_missing")) extra.push("safetyAnswers");
    if (
      !targets &&
      extra.length === 0 &&
      missingBodyFields(profile).length === 0 &&
      profile.goal !== null
    ) {
      extra.push("body");
    }
    return {
      ok: false,
      refusal: { kind: "insufficient_data", missing: missingNames(profile, extra) },
    };
  }

  /* P7: a user-confirmed expenditure adjustment shifts the resolved
     energy target by exactly the stored delta — the engine's goal
     delta is preserved because the delta was derived against the
     engine's own maintenance estimate (see expenditure.ts). The
     shared apply rule (targetAdjustment.ts) refuses results outside
     the sane band; a refused adjustment leaves the engine's targets
     standing rather than clamping to a number nobody confirmed. */
  if (input.targetAdjustmentKcal) {
    targets = adjustedTargets(targets, input.targetAdjustmentKcal) ?? targets;
  }

  const goal = profile.goal;
  /* P12: the timeline's clock anchor — the person's usual wake
     and bed times, validated once here and recorded on the
     snapshot on the cuisine precedent (scheduling-shaping only:
     named by the staleness check when it changes, never part of
     the fingerprint, never near a target). */
  const dayAnchor = dayAnchorFor(input.wakeTime, input.bedTime);
  /* P14: the snack placement the day is composed under — the
     person's preference, or the widest-gap default the timeline
     has always used. Recorded on the snapshot beside the anchor
     (scheduling-shaping only, on its precedent). */
  const snackPlacement: SnackPlacement = input.snackPlacement ?? "widest_gap";
  const snapshot: PlanInputsSnapshot = {
    ...planInputsSnapshotOf(profile, safety, targets),
    wakeTime: dayAnchor ? input.wakeTime! : null,
    bedTime: dayAnchor ? input.bedTime! : null,
    snackPlacement,
  };
  /* P11: the snack belongs to a complete day. A stated meals-per-day
     below four used to drop the snack slot entirely — the owner's
     own three-meal plan had no snack at all. The slot structure now
     always carries the snack; splitTargets renormalises the shares
     over it, so the day's totals never move, and the structure
     notes name the addition when it goes beyond the stated count. */
  const statedSlots = mealSlotsFor(profile.dietary.mealsPerDay);
  const snackAdded = !statedSlots.includes("snack");
  const slots = snackAdded
    ? MEALS.filter((meal) => meal === "snack" || statedSlots.includes(meal))
    : statedSlots;
  const structureReasons: PlanReason[] = [];
  if (snackAdded && profile.dietary.mealsPerDay !== null) {
    structureReasons.push({ kind: "snack-added", mealsPerDay: profile.dietary.mealsPerDay });
  }
  /* P10: the stated hunger pattern tilts the split toward the hungry
     part of the day — shares move, totals never do. */
  const splits = splitTargets(targets, slots, profile.behavioural.hungerPattern);
  const pool = eligiblePool(profile, input.foods);

  /* P6+P7: the log-adaptive bias. The recent logged days are judged
     against the targets just resolved — the targets themselves are
     never moved by what the log shows; only selection is biased,
     and only when the log actually speaks. P7 widens what the log
     can teach: which dishes the person returns to, which served
     dish they never took up, and which micronutrients the logged
     week runs short of (see planAdaptation's learning pass). */
  const learning: PlanLearning | null = input.recentLog
    ? planLearningFor(input.recentLog, input.day, targets, {
        storedPlan: input.storedPlan ?? null,
        sex: profile.sex === "unspecified" ? null : profile.sex,
      })
    : null;
  const adaptation = learning?.adaptation ?? null;

  /* Compose the day (P2): the pool in the day's rotation order, layered
     per meal over shared day state — foods already suggested are
     deprioritised (variety), and the floor totals accumulate so later
     meals can react. The vegetable aim spreads the 400 g ICMR floor
     across the main meals, held inside the per-meal caps.
     Module 06 (spec §4.4): the SUGGESTION pool loses the raw/dry-basis
     foods — dry pulses, dry grains, flours — whose record grams are
     not grams on a plate; they are never served as a composed
     suggestion, a snack item or a top-up. The identity pool above
     stays whole: the composition notes judge dish lines through it
     (a recipe's dry-lentil line is an ingredient, cooked by the
     method — not a portion anybody is handed), and a raw-basis food
     remains the user's to search for and log. */
  const ctx: ComposeContext = {
    ordered: rotationOrder(
      input.day,
      pool.filter((food) => !isRawBasisFood(food)),
    ),
    pattern: planPatternOf(profile.dietary.pattern),
    used: new Set<string>(),
    vegG: 0,
    fruitG: 0,
    milkCurdG: 0,
    proteinFirst: adaptation?.proteinShortfall ?? false,
    lowProteinDensity: targets.proteinG / targets.kcal < 0.055,
    cravingKinds: profile.behavioural.cravingKinds,
  };
  const mainCount = splits.filter((s) => s.meal !== "snack").length;
  const hasSnack = splits.some((s) => s.meal === "snack");
  const vegTargetG = mainCount > 0 ? Math.min(240, Math.max(130, Math.round(420 / mainCount))) : 0;
  /* P5: the dish pool, judged once against the person's own gates.
     When it can fill a main meal's anchor slot the meal is composed
     of dishes; where it cannot, the layered food composition fills
     that meal — the two never mix within a meal's main structure. */
  const behaviourReasons: PlanReason[] = [];
  let dishData: DishPoolData | null = null;
  if (input.dishes && input.dishes.length > 0) {
    const pooled = dishPoolFor(profile, input.dishes, input.activeModes ?? []);
    dishData = pooled.data;
    /* P13: a budget widening is named before the reasons judge the
       result — the same honesty the kitchen relaxations get. */
    behaviourReasons.push(...pooled.reasons);
  }
  /* P10: the behavioural kitchen gates narrow the pool further —
     equipment, cooking ability and the weekday prep-time cap, all
     read from the person's own Assessment answers (see
     gateDishPoolForKitchen). P13: a gate combination that starves
     the pool relaxes in named stages instead of handing the day
     to the layered food composition. */
  let preferNoCook = false;
  if (dishData) {
    const gated = gateDishPoolForKitchen(dishData, profile.behavioural, input.day);
    dishData = gated.data;
    preferNoCook = gated.preferNoCook;
    behaviourReasons.push(...gated.reasons);
  }
  /* P7: the dish bias. Micro-richness is judged here, where the
     candidates' computed panels exist: a dish is rich in a gap
     nutrient when one serving carries at least MICRO_RICH_SHARE of
     that nutrient's reference. The bias partitions the day's
     rotation order (favourites and micro-rich dishes forward,
     served-but-unlogged dishes back) and rides into the anchor
     pick, so bases, sides and anchors all hear it. With nothing
     learned, there is no bias and the order is P6's exactly. */
  const microRich = new Set<string>();
  if (learning && dishData) {
    for (const gap of learning.microGaps) {
      for (const c of dishData.candidates) {
        const value = c.nutrients[gap.key];
        if (value !== undefined && value >= MICRO_RICH_SHARE * gap.reference) {
          microRich.add(c.dish.id);
        }
      }
    }
  }
  const dishBias: DishBias | undefined =
    learning &&
    (learning.favouredDishes.length > 0 ||
      learning.deprioritisedDishes.length > 0 ||
      microRich.size > 0)
      ? {
          favoured: new Set(learning.favouredDishes.map((d) => d.dishId)),
          microRich,
          deprioritised: new Set(learning.deprioritisedDishes.map((d) => d.dishId)),
        }
      : undefined;
  const dishOrdered = dishData
    ? orderByDishBias(orderDishesForDay(dishData.candidates, input.day), dishBias)
    : [];
  /* P8: the dishes the previous plan served, by slot — read from
   *  the stored plan whenever it names an earlier day (the same
   *  guard the learning pass puts on its stored-plan signals).
   *  A same-day stored plan is this day's own earlier draft, not
   *  yesterday: re-composing today must reproduce today's plan,
   *  so the penalty stays silent for it. */
  const servedYesterday = new Map<Meal, Set<string>>();
  if (input.storedPlan && input.storedPlan.day < input.day) {
    for (const meal of input.storedPlan.meals) {
      if (meal.dishes.length === 0) continue;
      let slot = servedYesterday.get(meal.meal);
      if (!slot) {
        slot = new Set<string>();
        servedYesterday.set(meal.meal, slot);
      }
      for (const served of meal.dishes) slot.add(served.dishId);
    }
  }
  /* P8: the pick's ranking terms — the P6 lean, the P7 bias, the
   *  cuisine preference when it names a region, and the previous
   *  plan's served dishes. */
  const pickOpts: DishPickOpts = {
    proteinFirst: adaptation?.proteinShortfall ?? false,
    bias: dishBias,
    cuisine:
      profile.dietary.cuisinePreference === "north_indian" ||
      profile.dietary.cuisinePreference === "south_indian"
        ? profile.dietary.cuisinePreference
        : null,
    ...(servedYesterday.size > 0 ? { servedYesterday } : {}),
    /* P10: the behavioural pick shaping — basic cooking prices long
     *  methods, low confidence leans on the familiar. */
    basicCooking: profile.behavioural.cookingAbility === "basic",
    lowConfidence:
      profile.behavioural.confidence !== null && profile.behavioural.confidence <= 2,
    /* P13: the kitchen ladder's no-cook preference, when it fired,
     *  and the protein-wave preference, switched by the resolved
     *  guide's own protein density. */
    ...(preferNoCook ? { preferNoCook } : {}),
    proteinWaveBonus: targets.proteinG / targets.kcal >= PROTEIN_WAVE_GUIDE_DENSITY,
  };
  const usedDishIds = new Set<string>();
  const meals: PlanMeal[] = splits.map((split) => {
    if (split.meal === "snack") {
      /* P13: the snack composes a real dish first — a shake, a
         protein snack, a breakfast dish — and plain foods only
         when the pool offers no snack dish at all. Until method
         12 this slot was built with an empty dish list by
         construction, which made the whole shake and protein-
         snack shelves unservable. */
      if (dishData) {
        const dish = composeSnackDish(dishOrdered, usedDishIds, input.day, split, pickOpts);
        if (dish) {
          return {
            meal: split.meal,
            kcal: split.kcal,
            proteinG: split.proteinG,
            dishes: [dish],
            suggestions: [],
            note: null,
          };
        }
      }
      const suggestions = composeSnack(ctx, split);
      return {
        meal: split.meal,
        kcal: split.kcal,
        proteinG: split.proteinG,
        dishes: [],
        suggestions,
        ...mealNoteFields(suggestions.length === 0 ? EMPTY_MEAL_REASON : null),
      };
    }
    if (dishData) {
      const dish = composeSingleDishMeal(dishOrdered, usedDishIds, input.day, split, pickOpts);
      if (dish) {
        /* P14: the accompaniment — a gravy anchor at lunch or
           dinner is served its base beside it, as a second dish
           in the same meal. The base is on the plate from the
           first composition, so every pass that follows (the day
           guard, the top-ups, the reconciliation) judges the day
           the person will actually eat. */
        const dishes = [dish];
        const anchorDish = dishData.byId.get(dish.dishId);
        if (anchorDish) {
          const base = accompanimentFor(anchorDish, split.meal, dishOrdered);
          if (base) dishes.push(base);
        }
        return {
          meal: split.meal,
          kcal: split.kcal,
          proteinG: split.proteinG,
          dishes,
          suggestions: [],
          note: null,
        };
      }
    }
    const { suggestions, missingLayers } = composeMainMeal(ctx, split, {
      vegTargetG,
      fruitAtBreakfast: !hasSnack,
      isBreakfast: split.meal === "breakfast",
    });
    return {
      meal: split.meal,
      kcal: split.kcal,
      proteinG: split.proteinG,
      dishes: [],
      suggestions,
      ...mealNoteFields(
        suggestions.length === 0
          ? EMPTY_MEAL_REASON
          : missingLayers.length > 0
            ? { kind: "meal-missing-layers", layers: missingLayers }
            : null,
      ),
    };
  });
  const byId = new Map(pool.map((f) => [f.id, f]));
  const dishById = dishData?.byId ?? new Map<string, Dish>();
  /* P8: the hard pattern post-condition — every served dish is
   *  re-verified against the person's pattern on the composed
   *  meals themselves. A violating meal (impossible by the pool's
   *  construction) is recomposed from foods rather than served. */
  for (const badMeal of patternViolations(meals, dishById, planPatternOf(profile.dietary.pattern))) {
    const idx = meals.findIndex((m) => m.meal === badMeal);
    const split = splits.find((s) => s.meal === badMeal);
    if (idx < 0 || !split) continue;
    const { suggestions, missingLayers } = composeMainMeal(ctx, split, {
      vegTargetG,
      fruitAtBreakfast: !hasSnack,
      isBreakfast: split.meal === "breakfast",
    });
    meals[idx] = {
      meal: split.meal,
      kcal: split.kcal,
      proteinG: split.proteinG,
      dishes: [],
      suggestions,
      ...mealNoteFields(
        suggestions.length === 0
          ? EMPTY_MEAL_REASON
          : missingLayers.length > 0
            ? { kind: "meal-missing-layers", layers: missingLayers }
            : null,
      ),
    };
  }
  /* P8: the day guard — dish scales are repaired toward the day's
   *  bands, and a day still outside them re-picks its worst meal
   *  at the slot's optimum (see enforceDayBands). */
  const candidateById = dishData
    ? new Map(dishData.candidates.map((c) => [c.dish.id, c]))
    : new Map<string, DishCandidate>();
  if (dishData) {
    enforceDayBands(meals, dishOrdered, candidateById, targets, input.day, pickOpts);
  }
  /* P3 maturity: cap the plate, close the protein gap toward the
     target, reconcile the day's energy back to its guide, then hold
     the dominance line — in that order, so each pass judges the plan
     the previous one left, and the notes judge them all. P5 inserts
     its top-up pass between the protein closing and the energy
     reconciliation: the closing works the food-composed meals, the
     top-ups complete the dish-composed day, and reconciliation then
     fine-tunes the whole. */
  applyItemCap(meals, byId, dishById);
  closeProteinGap(ctx, meals, byId, targets.proteinG);
  /* P11: the top-up pass used to run only when the day carried a
   * dish. A food-composed day — the layered fallback, or a pool
   * whose dishes are all gated out (vegan + no-cook is the sharp
   * case) — stopped at its per-item caps and landed near half its
   * guide with main meals skewed far under their shares. The same
   * closing pass now completes both compositions: real foods,
   * capped portions, the pattern judged at the pool. */
  addTopUps(ctx, meals, targets, adaptation?.energyOvershoot ?? false);
  /* P8: the guard runs once more after the top-up rounds. The
   *  protein top-ups spend up to the +5% energy cap by design, and
   *  before them the dish scales often cannot move (protein sits at
   *  its floor); with the top-ups in, the scales can re-centre the
   *  day inside its bands instead of riding the cap's rounding. */
  if (dishData) {
    enforceDayBands(meals, dishOrdered, candidateById, targets, input.day, pickOpts);
  }
  reconcileEnergy(meals, byId, targets, dishById);
  applyProteinDominanceCap(meals, byId, targets.proteinG);
  /* P11: the overshoot trim runs last among the portion passes —
     it judges the day the closing, top-up, guard, reconciliation
     and dominance passes together left, and pulls an over-band
     protein total back toward its ceiling. */
  trimProteinOvershoot(meals, byId, targets);
  /* P11: the day's water, read from the same source as its targets —
     the gated outcome carries its own figure; the fallback path
     reads the caller's body-profile figure. Either way the number
     is the body engine's, computed from the person's own metrics. */
  const gatedWaterMl = input.gatedOutcome.ok ? input.gatedOutcome.targets.waterMl : null;
  const waterTargetMl = validWaterTargetMl(
    targetsSource === "assessment"
      ? (gatedWaterMl ?? input.waterMl)
      : (input.waterMl ?? gatedWaterMl),
  );
  const dayStart = dayStartFor(waterTargetMl, meals);
  /* P12: the finished day, laid out from waking to sleep — the
     timeline schedules the meals as they stand; it is computed
     last so it describes the plan the passes actually left. */
  const timeline = dayTimelineFor(meals, dayAnchor, snackPlacement);
  /* The adaptation's explanations lead the reasons: they say why this
     plan leans the way it does, before the reasons judge the result.
     The P7 learning reasons follow the P6 ones — what the log taught,
     in the order it was learned. The plan's `notes` strings are
     DERIVED from these reasons through reasons.ts (brief v4: the
     planner returns data, the copy module owns the words), so the
     stored text and the structured reasons can never disagree. */
  const reasons: PlanReason[] = [
    ...(adaptation?.reasons ?? []),
    ...(learning?.reasons ?? []),
    /* P10: the behavioural gates' explanations — a relaxation or a
       kitchen fallback is named before the reasons judge the result. */
    ...behaviourReasons,
    /* P11: the day-structure reason — a snack added beyond the stated
       meal count is named, never silent. */
    ...structureReasons,
    ...compositionReasons(meals, pool, targets, dishById),
  ];
  const notes = reasonDetails(reasons);

  return {
    ok: true,
    plan: {
      id: input.id ?? newNutritionId("plan"),
      day: input.day,
      generatedAt: input.now,
      goal,
      goalProfile: goalProfileOf(goal),
      targets,
      targetsSource,
      safetyClassification: safety.classification,
      cautions: safety.findings.filter((f) => !f.blocking).map((f) => f.summary),
      notes,
      reasons,
      methodVersion: PLAN_METHOD_VERSION,
      morning: dayStart.morning,
      ...(dayStart.hydration ? { hydration: dayStart.hydration } : {}),
      timeline,
      meals,
      inputs: snapshot,
      fingerprint: fingerprintOfInputs(snapshot),
    },
  };
}

/* --------------------------------- storage --------------------------------- */

/**
 * The plan lives in the shared preferences document under its own
 * versioned key, exactly the pattern the foods and the food log set
 * (design §4.3): sync (per-key merge into `user_prefs`), export
 * (`loadDoc()` wholesale) and erasure (`erase_my_data()` deletes the
 * caller's `user_prefs` row wholesale) are inherited by construction —
 * verified against `prefs.ts`, `useExportBundle` and the erase function,
 * none of which enumerate keys.
 */
export const PLAN_KEY = "health.plan.v1";
export const PLAN_VERSION = 1;

export interface PlanValue {
  version: typeof PLAN_VERSION;
  plan: DailyPlan;
}

export function planValueOf(plan: DailyPlan): PlanValue {
  return { version: PLAN_VERSION, plan };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function numIn(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return null;
  }
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function numOrNull(value: unknown, min: number, max: number): number | null {
  return value === null ? null : numIn(value, min, max);
}

const GOALS: readonly VitalisGoal[] = ["lose", "maintain", "gain", "recomp", "general_health"];
const GOAL_PROFILES: readonly PlanGoalProfile[] = ["lose", "gain", "maintain", "recomp"];
const SUGGESTION_LAYERS: readonly SuggestionLayer[] = [
  "base",
  "protein",
  "vegetables",
  "finishing",
  "snack",
  "topup",
];
const PLAN_DISH_ROLES: readonly PlanDishRole[] = ["anchor", "base", "side"];
const ACTIVITIES: readonly ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
];
const PATTERNS: readonly DietaryPattern[] = [
  "omnivore",
  "vegetarian",
  "vegan",
  "eggetarian",
  "pescatarian",
  "other",
];
const SEXES: readonly Sex[] = ["female", "male", "unspecified"];
const TARGET_SOURCES: readonly DailyPlan["targetsSource"][] = ["assessment", "body_profile"];
const TIMELINE_KINDS: readonly PlanTimelineKind[] = ["wake", "meal", "wind_down", "sleep"];
const TIMELINE_ANCHORS: readonly PlanTimeline["anchor"][] = ["sleep_log", "relative"];
const SNACK_PLACEMENTS: readonly SnackPlacement[] = ["widest_gap", "morning"];

function parseSnapshot(raw: unknown): PlanInputsSnapshot | null {
  if (!isRecord(raw)) return null;
  const goal = raw["goal"] === null ? null : oneOf(raw["goal"], GOALS);
  if (raw["goal"] !== null && goal === null) return null;
  const sex = oneOf(raw["sex"], SEXES);
  if (!sex) return null;
  const ageYears = numOrNull(raw["ageYears"], 13, 110);
  if (raw["ageYears"] !== null && ageYears === null) return null;
  const heightCm = numOrNull(raw["heightCm"], 100, 250);
  if (raw["heightCm"] !== null && heightCm === null) return null;
  const weightKg = numOrNull(raw["weightKg"], 25, 350);
  if (raw["weightKg"] !== null && weightKg === null) return null;
  const targetWeightKg = numOrNull(raw["targetWeightKg"], 25, 350);
  if (raw["targetWeightKg"] !== null && targetWeightKg === null) return null;
  const activity = raw["activity"] === null ? null : oneOf(raw["activity"], ACTIVITIES);
  if (raw["activity"] !== null && activity === null) return null;
  const rateKgPerWeek = numIn(raw["rateKgPerWeek"], 0, 2);
  if (rateKgPerWeek === null) return null;
  const mealsPerDay = numOrNull(raw["mealsPerDay"], 1, 12);
  if (raw["mealsPerDay"] !== null && mealsPerDay === null) return null;
  const dietaryPattern =
    raw["dietaryPattern"] === null ? null : oneOf(raw["dietaryPattern"], PATTERNS);
  if (raw["dietaryPattern"] !== null && dietaryPattern === null) return null;
  /* The cuisine preference (P8): absent on snapshots stored before
     the question existed — read as unanswered; present-but-invalid
     is a tamper, like any other malformed field. */
  const cuisinePreference =
    raw["cuisinePreference"] === undefined || raw["cuisinePreference"] === null
      ? null
      : oneOf(raw["cuisinePreference"], CUISINE_PREFERENCES);
  if (
    raw["cuisinePreference"] !== undefined &&
    raw["cuisinePreference"] !== null &&
    cuisinePreference === null
  ) {
    return null;
  }
  /* The behavioural snapshot fields (P10): absent on snapshots stored
     before the questions existed — read as unanswered; present-but-
     invalid is a tamper, exactly like the cuisine preference above. */
  const prepBand = raw["prepTimeMaxMinutes"];
  const prepTimeMaxMinutes: PrepTimeMaxMinutes | null =
    prepBand === 10 || prepBand === 20 || prepBand === 35 || prepBand === 60 ? prepBand : null;
  if (prepBand !== undefined && prepBand !== null && prepTimeMaxMinutes === null) return null;
  const kitchenEquipment =
    raw["kitchenEquipment"] === undefined || raw["kitchenEquipment"] === null
      ? null
      : text(raw["kitchenEquipment"], 120) || null;
  if (
    raw["kitchenEquipment"] !== undefined &&
    raw["kitchenEquipment"] !== null &&
    kitchenEquipment === null
  ) {
    return null;
  }
  const cookingAbility =
    raw["cookingAbility"] === undefined || raw["cookingAbility"] === null
      ? null
      : oneOf(raw["cookingAbility"], COOKING_ABILITIES);
  if (
    raw["cookingAbility"] !== undefined &&
    raw["cookingAbility"] !== null &&
    cookingAbility === null
  ) {
    return null;
  }
  const eatingSetting =
    raw["eatingSetting"] === undefined || raw["eatingSetting"] === null
      ? null
      : oneOf(raw["eatingSetting"], EATING_SETTINGS);
  if (
    raw["eatingSetting"] !== undefined &&
    raw["eatingSetting"] !== null &&
    eatingSetting === null
  ) {
    return null;
  }
  const hungerPattern =
    raw["hungerPattern"] === undefined || raw["hungerPattern"] === null
      ? null
      : oneOf(raw["hungerPattern"], HUNGER_PATTERNS);
  if (
    raw["hungerPattern"] !== undefined &&
    raw["hungerPattern"] !== null &&
    hungerPattern === null
  ) {
    return null;
  }
  const confidence =
    raw["confidence"] === undefined || raw["confidence"] === null
      ? null
      : numIn(raw["confidence"], 1, 5);
  if (raw["confidence"] !== undefined && raw["confidence"] !== null && confidence === null) {
    return null;
  }
  /* The timeline anchor (P12): absent on snapshots stored before
     P12 — read as unanchored; present-but-invalid is a tamper,
     exactly like the behavioural fields above. */
  const wakeTime =
    raw["wakeTime"] === undefined || raw["wakeTime"] === null
      ? null
      : typeof raw["wakeTime"] === "string" && CLOCK_TIME_RE.test(raw["wakeTime"])
        ? raw["wakeTime"]
        : null;
  if (raw["wakeTime"] !== undefined && raw["wakeTime"] !== null && wakeTime === null) {
    return null;
  }
  const bedTime =
    raw["bedTime"] === undefined || raw["bedTime"] === null
      ? null
      : typeof raw["bedTime"] === "string" && CLOCK_TIME_RE.test(raw["bedTime"])
        ? raw["bedTime"]
        : null;
  if (raw["bedTime"] !== undefined && raw["bedTime"] !== null && bedTime === null) {
    return null;
  }
  /* The snack placement (P14): absent on snapshots stored before
     P14 — read as the default they were composed under; present-
     but-invalid is a tamper, exactly like the anchor above. */
  const snackPlacement =
    raw["snackPlacement"] === undefined || raw["snackPlacement"] === null
      ? null
      : oneOf(raw["snackPlacement"], SNACK_PLACEMENTS);
  if (
    raw["snackPlacement"] !== undefined &&
    raw["snackPlacement"] !== null &&
    snackPlacement === null
  ) {
    return null;
  }
  const safetyClassification = oneOf(raw["safetyClassification"], SAFETY_CLASSES);
  if (!safetyClassification) return null;
  const targetsKcal = numIn(raw["targetsKcal"], 0.01, 10000);
  const targetsProteinG = numIn(raw["targetsProteinG"], 0.01, 1000);
  if (targetsKcal === null || targetsProteinG === null) return null;
  return {
    goal,
    ageYears: ageYears === null ? null : Math.round(ageYears),
    sex,
    heightCm,
    weightKg,
    targetWeightKg,
    activity,
    rateKgPerWeek,
    mealsPerDay: mealsPerDay === null ? null : Math.round(mealsPerDay),
    dietaryPattern,
    cuisinePreference,
    prepTimeMaxMinutes,
    kitchenEquipment,
    cookingAbility,
    eatingSetting,
    hungerPattern,
    confidence: confidence === null ? null : Math.round(confidence),
    wakeTime,
    bedTime,
    snackPlacement,
    safetyClassification,
    targetsKcal,
    targetsProteinG,
  };
}

function parseSuggestion(raw: unknown): PlanSuggestion | null {
  if (!isRecord(raw)) return null;
  const foodId = text(raw["foodId"], 80);
  const name = text(raw["name"], 120);
  if (!foodId || !name) return null;
  const grams = numIn(raw["grams"], 0.1, 5000);
  if (grams === null) return null;
  const nutrients = parseEntryNutrients(raw["nutrients"]);
  if (!nutrients) return null;
  const provenance = parseFoodProvenance(raw["provenance"]);
  /* A stored suggestion may only carry a source the generator itself
     would use — a plan that claims IFCT values is not a plan Bloom made. */
  if (!provenance || (provenance.kind !== "usda" && provenance.kind !== "user_entered"))
    return null;
  const suggestion: PlanSuggestion = { foodId, name, grams, nutrients, provenance };
  /* The composition layer (P2): absent on P1 plans, which suggested
     without layers; present-but-invalid is a tamper and drops the
     suggestion, like any other malformed field. */
  if ("layer" in raw) {
    const layer = oneOf(raw["layer"], SUGGESTION_LAYERS);
    if (!layer) return null;
    suggestion.layer = layer;
  }
  return suggestion;
}

/** A stored plan dish (P5): absent on plans stored before P5, read as
 *  an empty list. The provenance must be the recipe provenance the
 *  generator itself writes, naming the dish it prices — anything else
 *  is a tamper and drops the dish, like any other malformed field. */
function parsePlanDish(raw: unknown): PlanDish | null {
  if (!isRecord(raw)) return null;
  const dishId = text(raw["dishId"], 80);
  const name = text(raw["name"], 120);
  if (!dishId || !name) return null;
  const hindi = text(raw["hindi"], 120);
  const role = oneOf(raw["role"], PLAN_DISH_ROLES);
  if (!role) return null;
  const servings = numIn(raw["servings"], 0.25, 10);
  if (servings === null) return null;
  const nutrients = parseEntryNutrients(raw["nutrients"]);
  if (!nutrients) return null;
  const provenance = parseFoodProvenance(raw["provenance"]);
  if (!provenance || provenance.kind !== "recipe" || provenance.sourceId !== dishId) return null;
  return { dishId, name, hindi, role, servings, nutrients, provenance };
}

/* --------------------- reason parsing (brief v4) ---------------------- */

/**
 * A stored reason, validated field by field. Reasons are DATA the
 * composer measured; a stored reason whose numbers are out of the
 * ranges the composer can produce is not one of ours and is dropped
 * (never fatal — the plan itself is judged by its own invariants).
 * Unknown kinds are dropped the same way: a newer build's reason
 * must never break an older build's plan, and reasonCopy renders
 * nothing for a kind it does not know.
 */
function parseKitchenStage(raw: unknown): KitchenRelaxationStage | null {
  if (!isRecord(raw)) return null;
  switch (raw["stage"]) {
    case "prep-cap-raised": {
      const minutes = numIn(raw["minutes"], 1, 600);
      return minutes === null ? null : { stage: "prep-cap-raised", minutes };
    }
    case "prep-time-set-aside":
      return { stage: "prep-time-set-aside" };
    case "cooking-included":
      return { stage: "cooking-included" };
    case "extra-equipment":
      return { stage: "extra-equipment" };
    case "equipment-set-aside":
      return { stage: "equipment-set-aside" };
    default:
      return null;
  }
}

function parseReason(raw: unknown): PlanReason | null {
  if (!isRecord(raw)) return null;
  const rawKind = raw["kind"];
  if (typeof rawKind !== "string" || !(PLAN_REASON_KINDS as readonly string[]).includes(rawKind)) {
    return null;
  }
  const kind = rawKind as PlanReason["kind"];
  const num = (key: string, min: number, max: number): number | null =>
    numIn(raw[key], min, max);
  switch (kind) {
    case "log-protein-shortfall": {
      const days = num("days", 1, 31);
      const avgProteinG = num("avgProteinG", 0, 1000);
      const targetProteinG = num("targetProteinG", 0.01, 1000);
      return days === null || avgProteinG === null || targetProteinG === null
        ? null
        : { kind, days: Math.round(days), avgProteinG, targetProteinG };
    }
    case "log-energy-overshoot": {
      const days = num("days", 1, 31);
      const avgKcal = num("avgKcal", 0, 10000);
      const targetKcal = num("targetKcal", 0.01, 10000);
      return days === null || avgKcal === null || targetKcal === null
        ? null
        : { kind, days: Math.round(days), avgKcal, targetKcal };
    }
    case "favoured-dishes": {
      const windowDays = num("windowDays", 1, 365);
      if (windowDays === null || !Array.isArray(raw["dishes"])) return null;
      const dishes: { name: string; count: number }[] = [];
      for (const item of raw["dishes"].slice(0, 3)) {
        if (!isRecord(item)) return null;
        const name = text(item["name"], 120);
        const count = numIn(item["count"], 1, 10000);
        if (!name || count === null) return null;
        dishes.push({ name, count: Math.round(count) });
      }
      return dishes.length === 0 ? null : { kind, dishes, windowDays: Math.round(windowDays) };
    }
    case "deprioritised-dishes": {
      const windowDays = num("windowDays", 1, 365);
      const planDay = text(raw["planDay"], 10);
      if (windowDays === null || !/^\d{4}-\d{2}-\d{2}$/.test(planDay)) return null;
      if (!Array.isArray(raw["names"])) return null;
      const names: string[] = [];
      for (const item of raw["names"].slice(0, 3)) {
        const name = text(item, 120);
        if (!name) return null;
        names.push(name);
      }
      return names.length === 0
        ? null
        : { kind, names, planDay, windowDays: Math.round(windowDays) };
    }
    case "micro-gap": {
      const label = text(raw["label"], 60);
      const days = num("days", 1, 365);
      const avg = num("avg", 0, 100000);
      const reference = num("reference", 0.01, 100000);
      const unit = raw["unit"];
      if (!label || days === null || avg === null || reference === null) return null;
      if (unit !== "g" && unit !== "mg") return null;
      return { kind, label, days: Math.round(days), avg, unit, reference };
    }
    case "budget-widened": {
      if (raw["ceilingRupees"] === null) return { kind, ceilingRupees: null };
      const ceilingRupees = num("ceilingRupees", 1, 100000);
      return ceilingRupees === null ? null : { kind, ceilingRupees };
    }
    case "kitchen-relaxed": {
      if (!isRecord(raw["answers"]) || !Array.isArray(raw["stages"])) return null;
      const answers = raw["answers"];
      if (typeof answers["noCook"] !== "boolean") return null;
      if (typeof answers["equipmentListed"] !== "boolean") return null;
      const capMinutes =
        answers["capMinutes"] === null ? null : numIn(answers["capMinutes"], 1, 600);
      if (answers["capMinutes"] !== null && capMinutes === null) return null;
      const stages: KitchenRelaxationStage[] = [];
      for (const item of raw["stages"].slice(0, 8)) {
        const stage = parseKitchenStage(item);
        if (!stage) return null;
        stages.push(stage);
      }
      return {
        kind,
        answers: {
          noCook: answers["noCook"],
          capMinutes,
          equipmentListed: answers["equipmentListed"],
        },
        stages,
      };
    }
    case "kitchen-cap-raised": {
      const capMinutes = num("capMinutes", 1, 600);
      const stageMinutes = num("stageMinutes", 1, 600);
      return capMinutes === null || stageMinutes === null
        ? null
        : { kind, capMinutes, stageMinutes };
    }
    case "kitchen-cap-quickest": {
      const capMinutes = num("capMinutes", 1, 600);
      return capMinutes === null ? null : { kind, capMinutes };
    }
    case "snack-added": {
      const mealsPerDay = num("mealsPerDay", 1, 6);
      return mealsPerDay === null ? null : { kind, mealsPerDay: Math.round(mealsPerDay) };
    }
    case "veg-shortfall":
    case "fruit-shortfall":
    case "milk-curd-shortfall": {
      const actualG = num("actualG", 0, 100000);
      const guidelineG = num("guidelineG", 0.01, 100000);
      return actualG === null || guidelineG === null ? null : { kind, actualG, guidelineG };
    }
    case "protein-sources-few": {
      const count = num("count", 0, 1000);
      return count === null ? null : { kind, count: Math.round(count) };
    }
    case "food-groups-few": {
      const count = num("count", 0, 100);
      if (count === null) return null;
      if (raw["poolCount"] === null) return { kind, count: Math.round(count), poolCount: null };
      const poolCount = num("poolCount", 0, 100);
      return poolCount === null
        ? null
        : { kind, count: Math.round(count), poolCount: Math.round(poolCount) };
    }
    case "protein-under": {
      const actualG = num("actualG", 0, 1000);
      const targetG = num("targetG", 0.01, 1000);
      const blocker = raw["blocker"];
      if (actualG === null || targetG === null) return null;
      if (blocker !== "caps" && blocker !== "energy-topup-in-day" && blocker !== "energy-no-topup") {
        return null;
      }
      return { kind, actualG, targetG, blocker };
    }
    case "protein-over": {
      const actualG = num("actualG", 0, 1000);
      const targetG = num("targetG", 0.01, 1000);
      return actualG === null || targetG === null ? null : { kind, actualG, targetG };
    }
    case "kcal-off-guide": {
      const actualKcal = num("actualKcal", 0, 10000);
      const targetKcal = num("targetKcal", 0.01, 10000);
      const direction = raw["direction"];
      if (actualKcal === null || targetKcal === null) return null;
      if (direction !== "over" && direction !== "under") return null;
      return { kind, actualKcal, targetKcal, direction };
    }
    case "meal-empty":
      return { kind };
    case "meal-missing-layers": {
      if (!Array.isArray(raw["layers"])) return null;
      const layers: string[] = [];
      for (const item of raw["layers"].slice(0, 8)) {
        const layer = text(item, 60);
        if (!layer) return null;
        layers.push(layer);
      }
      return layers.length === 0 ? null : { kind, layers };
    }
    default:
      return null;
  }
}

function parsePlan(raw: unknown): DailyPlan | null {
  if (!isRecord(raw)) return null;
  const id = text(raw["id"], 80);
  if (!id) return null;
  const day = raw["day"];
  if (typeof day !== "string" || !isRealDayKey(day)) return null;
  const generatedAt = typeof raw["generatedAt"] === "string" ? raw["generatedAt"] : "";
  const goal = oneOf(raw["goal"], GOALS);
  if (!goal) return null;
  const goalProfile = oneOf(raw["goalProfile"], GOAL_PROFILES);
  /* The profile must be the one the goal implies — a relabelled plan is
     refused, not reinterpreted. */
  if (!goalProfile || goalProfile !== goalProfileOf(goal)) return null;
  if (!isRecord(raw["targets"])) return null;
  const kcal = numIn(raw["targets"]["kcal"], 0.01, 10000);
  const proteinG = numIn(raw["targets"]["proteinG"], 0.01, 1000);
  if (kcal === null || proteinG === null) return null;
  const targets: NutritionTargets = { kcal, proteinG };
  const targetsSource = oneOf(raw["targetsSource"], TARGET_SOURCES);
  if (!targetsSource) return null;
  const safetyClassification = oneOf(raw["safetyClassification"], SAFETY_CLASSES);
  if (!safetyClassification) return null;
  const cautions: string[] = [];
  if (Array.isArray(raw["cautions"])) {
    for (const item of raw["cautions"].slice(0, 10)) {
      const line = text(item, 400);
      if (line) cautions.push(line);
    }
  }
  /* Composition notes (P2): absent on P1 plans, read as empty. The
     length bound is a TAMPER bound on stored data, not an editor:
     it once sat at 300 and cut the composer's own kitchen note
     mid-word on every read (M-81) — 2,000 sits far above any note
     the composer can produce (the longest is ~370 chars) while
     still bounding a forged value. Sentences are never sliced to
     fit a display; brief v4's reasons carry the copy now. */
  const notes: string[] = [];
  if (Array.isArray(raw["notes"])) {
    for (const item of raw["notes"].slice(0, 8)) {
      const line = text(item, 2000);
      if (line) notes.push(line);
    }
  }
  /* The structured reasons (brief v4): absent on plans stored
     before they existed, read as empty — those plans render their
     `notes` strings, which now arrive whole. An entry that does
     not validate is dropped, never fatal. */
  const reasons: PlanReason[] = [];
  if (Array.isArray(raw["reasons"])) {
    for (const item of raw["reasons"].slice(0, 24)) {
      const reason = parseReason(item);
      if (reason) reasons.push(reason);
    }
  }
  /* The composition method (P2): absent on P1 plans, which are method 1
     by definition; present-but-invalid is a tamper and refuses the plan. */
  let methodVersion = 1;
  if ("methodVersion" in raw) {
    const parsed = numIn(raw["methodVersion"], 1, 999);
    if (parsed === null || Math.round(parsed) !== parsed) return null;
    methodVersion = parsed;
  }
  /* The day start (P11): absent on pre-P11 plans, read as absent.
     Present-but-invalid is a tamper and refuses the plan, exactly
     as a forged method version does — and a hydration schedule
     whose parts do not sum to its stated target is not a schedule
     this engine wrote. */
  let morning: PlanMorning | undefined;
  if ("morning" in raw) {
    if (!isRecord(raw["morning"])) return null;
    const waterMl = numIn(raw["morning"]["waterMl"], 1, 1000);
    if (waterMl === null) return null;
    morning = { waterMl: Math.round(waterMl) };
  }
  let hydration: PlanHydration | undefined;
  if ("hydration" in raw) {
    if (!isRecord(raw["hydration"])) return null;
    const targetMl = numIn(raw["hydration"]["targetMl"], 100, 10000);
    const wakeMl = numIn(raw["hydration"]["wakeMl"], 1, 1000);
    const totalMl = numIn(raw["hydration"]["totalMl"], 100, 10000);
    if (targetMl === null || wakeMl === null || totalMl === null) return null;
    const rawPerMeal: unknown = raw["hydration"]["perMeal"];
    if (!Array.isArray(rawPerMeal) || rawPerMeal.length > MEALS.length) return null;
    const perMeal: { meal: Meal; ml: number }[] = [];
    const seenHydrationMeals = new Set<Meal>();
    for (const item of rawPerMeal) {
      if (!isRecord(item)) return null;
      const meal = oneOf(item["meal"], MEALS);
      const ml = numIn(item["ml"], 0, 5000);
      if (!meal || ml === null || seenHydrationMeals.has(meal)) return null;
      seenHydrationMeals.add(meal);
      perMeal.push({ meal, ml: Math.round(ml) });
    }
    const summed = Math.round(wakeMl) + perMeal.reduce((a, p) => a + p.ml, 0);
    if (summed !== Math.round(totalMl) || Math.round(totalMl) !== Math.round(targetMl)) {
      return null;
    }
    hydration = {
      targetMl: Math.round(targetMl),
      wakeMl: Math.round(wakeMl),
      perMeal,
      totalMl: Math.round(totalMl),
    };
  }
  if (
    !Array.isArray(raw["meals"]) ||
    raw["meals"].length < 1 ||
    raw["meals"].length > MEALS.length
  ) {
    return null;
  }
  const meals: PlanMeal[] = [];
  const seenMeals = new Set<Meal>();
  for (const item of raw["meals"]) {
    if (!isRecord(item)) return null;
    const meal = oneOf(item["meal"], MEALS);
    if (!meal || seenMeals.has(meal)) return null;
    seenMeals.add(meal);
    const mealKcal = numIn(item["kcal"], 0, 10000);
    const mealProtein = numIn(item["proteinG"], 0, 1000);
    if (mealKcal === null || mealProtein === null) return null;
    const suggestions: PlanSuggestion[] = [];
    if (Array.isArray(item["suggestions"])) {
      for (const s of item["suggestions"].slice(0, 12)) {
        const suggestion = parseSuggestion(s);
        if (suggestion) suggestions.push(suggestion);
      }
    }
    /* The meal's dishes (P5): absent on plans stored before P5, read
       as empty — a pre-P5 plan is a food-composed plan, whole. */
    const dishes: PlanDish[] = [];
    if (Array.isArray(item["dishes"])) {
      for (const d of item["dishes"].slice(0, 6)) {
        const dish = parsePlanDish(d);
        if (dish) dishes.push(dish);
      }
    }
    meals.push({
      meal,
      kcal: Math.round(mealKcal),
      proteinG: round1(mealProtein),
      dishes,
      suggestions,
      /* Same M-81 discipline as the plan notes: the bound is a
         tamper bound (2,000), never an editor. */
      note: item["note"] === null ? null : text(item["note"], 2000) || null,
      /* noteReason rides along only when the stored meal carries
         the key at all — plans stored before reasons existed (and
         dish meals, which never carry one) round-trip byte-equal. */
      ...(Object.prototype.hasOwnProperty.call(item, "noteReason")
        ? {
            noteReason:
              item["noteReason"] === null ? null : parseReason(item["noteReason"]),
          }
        : {}),
    });
  }
  /* The split invariant is part of the plan's identity: meals that do not
     sum exactly to the targets are not a plan this engine generated. */
  if (meals.reduce((sum, m) => sum + m.kcal, 0) !== Math.round(targets.kcal)) return null;
  const proteinTenths = meals.reduce((sum, m) => sum + Math.round(m.proteinG * 10), 0);
  if (proteinTenths !== Math.round(targets.proteinG * 10)) return null;
  const inputs = parseSnapshot(raw["inputs"]);
  if (!inputs) return null;
  const fingerprint = typeof raw["fingerprint"] === "string" ? raw["fingerprint"] : "";
  /* The fingerprint must be the one the inputs produce — a plan whose
     stated inputs were edited after generation is refused whole. */
  if (!fingerprint || fingerprint !== fingerprintOfInputs(inputs)) return null;
  /* The day timeline (P12): absent on pre-P12 plans, read as absent.
     Present-but-invalid is a tamper and refuses the plan, on the
     same discipline as the hydration schedule: the sequence must
     open on waking and close at bedtime, its meal items must be
     exactly the plan's meals, a relative day must carry no clock
     times, and a timed day's times must run in order. */
  let timeline: PlanTimeline | undefined;
  if ("timeline" in raw) {
    if (!isRecord(raw["timeline"])) return null;
    const anchor = oneOf(raw["timeline"]["anchor"], TIMELINE_ANCHORS);
    if (!anchor) return null;
    const rawItems: unknown = raw["timeline"]["items"];
    if (!Array.isArray(rawItems) || rawItems.length < 4 || rawItems.length > 7) return null;
    const items: PlanTimelineItem[] = [];
    const seenTimelineMeals = new Set<Meal>();
    let lastKey = -1;
    for (const rawItem of rawItems) {
      if (!isRecord(rawItem)) return null;
      const kind = oneOf(rawItem["kind"], TIMELINE_KINDS);
      if (!kind) return null;
      const label = text(rawItem["label"], 40);
      if (!label) return null;
      let meal: Meal | undefined;
      if (kind === "meal") {
        const parsedMeal = oneOf(rawItem["meal"], MEALS);
        if (!parsedMeal || seenTimelineMeals.has(parsedMeal)) return null;
        seenTimelineMeals.add(parsedMeal);
        meal = parsedMeal;
      } else if (rawItem["meal"] !== undefined && rawItem["meal"] !== null) {
        return null;
      }
      let time: string | null = null;
      if (anchor === "sleep_log") {
        if (typeof rawItem["time"] !== "string" || !CLOCK_TIME_RE.test(rawItem["time"])) {
          return null;
        }
        time = rawItem["time"];
        let key = clockToMinutes(time);
        if (lastKey >= 0 && key < lastKey) key += 1440;
        if (lastKey >= 0 && key <= lastKey) return null;
        lastKey = key;
      } else if (rawItem["time"] !== null) {
        return null;
      }
      items.push({ kind, ...(meal ? { meal } : {}), time, label });
    }
    if (items[0]!.kind !== "wake" || items[items.length - 1]!.kind !== "sleep") return null;
    if (items.filter((i) => i.kind === "wake").length !== 1) return null;
    if (items.filter((i) => i.kind === "sleep").length !== 1) return null;
    if (items.filter((i) => i.kind === "wind_down").length > 1) return null;
    if (seenTimelineMeals.size !== meals.length) return null;
    for (const m of meals) {
      if (!seenTimelineMeals.has(m.meal)) return null;
    }
    timeline = { anchor, items };
  }
  return {
    id,
    day,
    generatedAt,
    goal,
    goalProfile,
    targets,
    targetsSource,
    safetyClassification,
    cautions,
    notes,
    reasons,
    methodVersion,
    ...(morning ? { morning } : {}),
    ...(hydration ? { hydration } : {}),
    ...(timeline ? { timeline } : {}),
    meals,
    inputs,
    fingerprint,
  };
}

/** Strict envelope parse for the plan value. Null on anything malformed —
 *  `getPref` then falls back, so a corrupt or tampered plan can never
 *  reach a screen as if Bloom had generated it. */
export function parsePlanValue(raw: unknown): DailyPlan | null {
  if (!isRecord(raw)) return null;
  if (raw["version"] !== PLAN_VERSION) return null;
  return parsePlan(raw["plan"]);
}

/* ------------------------------- pref access ------------------------------- */

export function readPlan(): DailyPlan | null {
  return getPref(PLAN_KEY, parsePlanValue, null);
}

export function writePlan(plan: DailyPlan): void {
  setPref(PLAN_KEY, planValueOf(plan));
}
