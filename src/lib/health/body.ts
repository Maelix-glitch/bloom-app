/**
 * Bloom — body & daily targets.
 *
 * The trackers answer "what happened today". This module answers the question
 * people actually arrive with: "what should I aim for?" Height, weight, age,
 * activity and a goal turn into a BMI, a resting metabolic rate, a daily
 * energy target, a protein target, a hydration target and — when a goal
 * weight is set — an honest timeline.
 *
 * Pure functions, no I/O. The numbers are standard, published formulas
 * (Mifflin–St Jeor for BMR; the hydration target is a drinking-water
 * share of EFSA's total-water adequate intake) and every screen that
 * shows them says what they are: an estimate, not a prescription.
 * Nothing here diagnoses anything, and the calorie target has a safety
 * floor so a very aggressive rate can never produce a dangerously low
 * number — a claim M-219 made true of every path that can move a
 * target, not just this one (see targetAdjustment.ts).
 */

export type BodyUnits = "metric" | "imperial";
export type BodySex = "female" | "male" | "unspecified";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very-active";
export type BodyGoal = "lose" | "maintain" | "gain" | "recomp";

export interface BodyProfile {
  units: BodyUnits;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  age: number | null;
  sex: BodySex;
  activity: ActivityLevel;
  goal: BodyGoal;
  /** kg per week; ignored when the goal is maintain. */
  rateKgPerWeek: number;
  updatedAt: string;
}

export const DEFAULT_BODY: BodyProfile = {
  units: "metric",
  heightCm: null,
  weightKg: null,
  targetWeightKg: null,
  age: null,
  sex: "unspecified",
  activity: "light",
  goal: "maintain",
  rateKgPerWeek: 0.5,
  updatedAt: "",
};

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  "very-active": 1.9,
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Mostly sitting",
  light: "Light — 1–2 days a week",
  moderate: "Moderate — 3–4 days a week",
  active: "Active — 5–6 days a week",
  "very-active": "Very active — daily training",
};

export const GOAL_LABEL: Record<BodyGoal, string> = {
  lose: "Lose weight",
  maintain: "Maintain",
  gain: "Gain weight",
  recomp: "Body recomposition",
};

export type BmiBand = "underweight" | "healthy" | "overweight" | "obese";

export const BMI_BAND_LABEL: Record<BmiBand, string> = {
  underweight: "Below the healthy range",
  healthy: "Healthy range",
  overweight: "Above the healthy range",
  obese: "Well above the healthy range",
};

export interface BodyTargets {
  bmi: number;
  bmiBand: BmiBand;
  healthyWeight: { min: number; max: number };
  bmr: number;
  tdee: number;
  /** Daily intake target for the chosen goal, with the safety floor applied. */
  calories: number;
  /** The raw deficit/surplus before the floor, for an honest explanation. */
  calorieDelta: number;
  floorApplied: boolean;
  proteinG: number;
  waterMl: number;
  /** Null when there is no goal weight. */
  weeksToGoal: number | null;
  goalDate: string | null;
  targetWeightKg: number | null;
}

const round = (n: number, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

export function isBodyReady(profile: BodyProfile): boolean {
  return Boolean(
    profile.heightCm && profile.weightKg && profile.heightCm >= 120 && profile.weightKg >= 30,
  );
}

export function bmiOf(heightCm: number, weightKg: number): number | null {
  if (!(heightCm > 0) || !(weightKg > 0)) return null;
  const m = heightCm / 100;
  return round(weightKg / (m * m), 1);
}

/**
 * BMI bands for Asian Indians (Indian Consensus Group, Misra et al.
 * 2009; ESI 2022 concordant): overweight begins at 23 and obesity at
 * 25 — not the WHO 25/30 cut-offs this module used before M-219
 * (audit F-08). The underweight gate (18.5) is population-independent
 * and unchanged. Bloom is India-first; its bands are the Indian ones.
 */
export function bmiBandOf(bmi: number): BmiBand {
  if (bmi < 18.5) return "underweight";
  if (bmi < 23) return "healthy";
  if (bmi < 25) return "overweight";
  return "obese";
}

/** The top of the healthy range under the same consensus: BMI 22.9. */
export const HEALTHY_BMI_MAX = 22.9;
/** Above this BMI a person is outside the healthy range, and protein
 *  is dosed on the reference weight below rather than actual weight. */
export const OVERWEIGHT_BMI = 23;

/**
 * The fastest pace the engine will plan, kg per week — the safety
 * domain's cap (vitalis/domain/safety MAX_RATE_KG_PER_WEEK), restated
 * here because this legacy module is deliberately dependency-free.
 * 0.75 kg/wk ≈ an 825 kcal/day deficit: the top of the AHA/ACC/TOS
 * prescription neighbourhood, inside the CDC's 1–2 lb/wk range. The
 * old 1.0 cap implied 1,100 kcal/day (M-219, audit F-04).
 */
export const MAX_RATE_KG_PER_WEEK = 0.75;

/** Mifflin–St Jeor. `unspecified` uses the midpoint of the two constants. */
export function bmrOf(profile: BodyProfile): number | null {
  if (!isBodyReady(profile) || !profile.age) return null;
  const base = 10 * profile.weightKg! + 6.25 * profile.heightCm! - 5 * profile.age;
  const sexConstant = profile.sex === "male" ? 5 : profile.sex === "female" ? -161 : -78;
  return round(base + sexConstant);
}

/**
 * The safety floor. These are commonly used minimums for self-directed
 * weight loss; the UI explains when the floor is doing the work instead of
 * silently showing a lower number.
 */
export function calorieFloor(sex: BodySex): number {
  if (sex === "male") return 1500;
  if (sex === "female") return 1200;
  return 1350;
}

export function bodyTargetsOf(profile: BodyProfile, today: string): BodyTargets | null {
  if (!isBodyReady(profile) || !profile.age) return null;
  const heightCm = profile.heightCm!;
  const weightKg = profile.weightKg!;
  const bmi = bmiOf(heightCm, weightKg)!;
  const bmiBand = bmiBandOf(bmi);
  const min = round(18.5 * (heightCm / 100) ** 2, 1);
  const max = round(HEALTHY_BMI_MAX * (heightCm / 100) ** 2, 1);
  const bmr = bmrOf(profile)!;
  const tdee = round(bmr * ACTIVITY_FACTOR[profile.activity]);

  const rate = Math.min(MAX_RATE_KG_PER_WEEK, Math.max(0.25, profile.rateKgPerWeek || 0.5));
  /* Recomposition is maintenance energy by definition — the same weight,
     differently composed — so it takes no rate delta, exactly like
     maintain. Only its protein band differs (below). */
  const rawDelta =
    profile.goal === "maintain" || profile.goal === "recomp" ? 0 : round((rate * 7700) / 7);
  const rawCalories = profile.goal === "lose" ? tdee - rawDelta : profile.goal === "gain" ? tdee + rawDelta : tdee;
  const floor = calorieFloor(profile.sex);
  const floorApplied = rawCalories < floor;
  const calories = Math.max(floor, Math.min(4500, round(rawCalories)));

  /* Protein bands (g per kg body weight): lose 1.8 (a deficit needs the
     most protection per calorie), gain 1.6, maintain 1.4. Recomposition
     gets 2.2 — the highest band of the four, because it asks for fat loss
     and muscle gain at maintenance energy, the most protein-demanding
     combination. 2.2 g/kg is the upper confidence bound in Morton et al.'s
     2018 meta-analysis of protein and lean mass (BJSM), and sits inside
     the ISSN position stand's range for maximising lean mass; the safety
     classifier separately blocks the profiles for whom a high-protein
     target needs a clinician (chronic kidney disease, pregnancy,
     eating-disorder history), so the band never reaches them from here.
     BASIS (M-219, audit F-05): the band multiplies a REFERENCE weight,
     not always the scale weight. Above the healthy range (BMI ≥ 23),
     dosing on actual weight treats adipose tissue as protein-demanding
     mass and — where the calorie floor binds — pushes protein past the
     IOM AMDR ceiling of 35% of energy (the owner's pair was 50.7%E).
     So above BMI 23 the basis is the healthy-ceiling weight
     (22.9 × height²): the lean-mass-protective dose for the body the
     plan is feeding, uninfluenced by the fat mass it is reducing. */
  const proteinPerKg =
    profile.goal === "lose" ? 1.8 : profile.goal === "gain" ? 1.6 : profile.goal === "recomp" ? 2.2 : 1.4;
  const proteinBasisKg = bmi >= OVERWEIGHT_BMI ? max : weightKg;
  const proteinG = round(proteinBasisKg * proteinPerKg);

  /* Hydration (M-219, audit F-07). The old rule — 35 ml per kg of
     scale weight, scheduled as DRINKING water — produced 3,350 ml to
     drink for a sedentary 95 kg man: more than EFSA's adequate intake
     for TOTAL water (food + drink: 2.5 L men / 2.0 L women, EFSA 2010,
     moderate temperature and activity) before any food moisture was
     counted, and it scaled with adipose mass, which holds little
     water. The target is now a drinking-water figure derived from
     that AI: roughly three quarters of total water typically arrives
     as drinks, the rest in food — men ≈ 1,900 ml, women ≈ 1,500 ml,
     unspecified the midpoint — plus an activity allowance for the
     sweat the AI's moderate-activity assumption does not cover.
     EFSA's AI assumes a temperate climate; the figure is a guide for
     ordinary days, and thirst and heat rightly override it. */
  const drinkingBaseMl =
    profile.sex === "female" ? 1500 : profile.sex === "male" ? 1900 : 1700;
  const activityBonus =
    profile.activity === "sedentary"
      ? 0
      : profile.activity === "light"
        ? 150
        : profile.activity === "moderate"
          ? 300
          : profile.activity === "active"
            ? 500
            : 700;
  const waterMl = Math.round(Math.min(3000, Math.max(1200, drinkingBaseMl + activityBonus)) / 50) * 50;

  const targetWeightKg =
    profile.targetWeightKg && profile.targetWeightKg >= 30
      ? profile.targetWeightKg
      : profile.goal === "maintain" || profile.goal === "recomp"
        ? weightKg
        : null;

  let weeksToGoal: number | null = null;
  let goalDate: string | null = null;
  /* A timeline is projected only for goals that move the scale. Maintain
     and recomp hold the current weight, so neither gets a goal date. */
  if (targetWeightKg && (profile.goal === "lose" || profile.goal === "gain")) {
    const diff = Math.abs(weightKg - targetWeightKg);
    /* The destination gate at this layer (M-219, audit F-03): no
       countdown is ever projected toward an underweight endpoint on a
       loss goal. The safety classifier refuses the plan outright; this
       keeps the legacy surfaces from displaying the countdown the
       classifier refused. */
    const targetBmi = bmiOf(heightCm, targetWeightKg);
    const underweightDestination =
      profile.goal === "lose" && targetBmi !== null && targetBmi < 18.5;
    if (diff >= 0.2 && !underweightDestination) {
      /* The timeline runs on the EFFECTIVE rate — the deficit or
         surplus the floored, capped target actually delivers — not
         the requested pace (M-219, audit F-06). When the floor binds,
         the requested rate is a promise the plan cannot keep: the
         owner's floor-bound −820 kcal/day is ~0.75 kg/wk, so his
         35 kg reads ~47 weeks, not the 35 the requested 1.0 kg/wk
         used to print. When the delivered delta is zero or runs the
         wrong way, no honest date exists and none is shown. */
      const deliveredDelta = profile.goal === "lose" ? tdee - calories : calories - tdee;
      const effectiveRate = (deliveredDelta * 7) / 7700;
      if (effectiveRate > 0) {
        weeksToGoal = Math.ceil(diff / effectiveRate);
        const date = new Date(`${today}T12:00:00`);
        date.setDate(date.getDate() + weeksToGoal * 7);
        goalDate = date.toISOString().slice(0, 10);
      }
    }
  }

  return {
    bmi,
    bmiBand,
    healthyWeight: { min, max },
    bmr,
    tdee,
    calories,
    calorieDelta:
      profile.goal === "lose" ? calories - tdee : profile.goal === "gain" ? calories - tdee : 0,
    floorApplied,
    proteinG,
    waterMl,
    weeksToGoal,
    goalDate,
    targetWeightKg,
  };
}

/** How much water is still sensible today, and what that looks like in glasses. */
export function hydrationStatus(targetMl: number, drankMl: number | null) {
  const drank = Math.max(0, drankMl ?? 0);
  const remaining = Math.max(0, targetMl - drank);
  const glass = 250;
  return {
    drank,
    remaining,
    glasses: Math.ceil(remaining / glass),
    percent: targetMl > 0 ? Math.min(1, drank / targetMl) : 0,
    met: remaining === 0,
  };
}

/* ------------------------------- storage --------------------------------- */

export const BODY_KEY = "health.body.v1";
export const WEIGHINS_KEY = "health.weighins.v1";
export const BODY_CHANGED = "bloom:body-changed";

function numOrNull(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10) / 10;
}

export function parseBodyProfile(raw: unknown): BodyProfile | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const units = r["units"] === "imperial" ? "imperial" : "metric";
  const sex: BodySex =
    r["sex"] === "female" || r["sex"] === "male" ? r["sex"] : "unspecified";
  const activity = (
    ["sedentary", "light", "moderate", "active", "very-active"] as ActivityLevel[]
  ).includes(r["activity"] as ActivityLevel)
    ? (r["activity"] as ActivityLevel)
    : "light";
  const goal = (["lose", "maintain", "gain", "recomp"] as BodyGoal[]).includes(r["goal"] as BodyGoal)
    ? (r["goal"] as BodyGoal)
    : "maintain";
  const rate = typeof r["rateKgPerWeek"] === "number" ? r["rateKgPerWeek"] : 0.5;
  return {
    units,
    heightCm: numOrNull(r["heightCm"], 100, 250),
    weightKg: numOrNull(r["weightKg"], 25, 350),
    targetWeightKg: numOrNull(r["targetWeightKg"], 25, 350),
    /* 18 is the product's floor (M-219, audit F-02): this legacy store
       used to accept 13, three years under the classifier's own
       adult_only gate — a stored 13–17 now parses as "not stated"
       rather than feeding arithmetic the gate would refuse. */
    age: numOrNull(r["age"], 18, 110),
    sex,
    activity,
    goal,
    rateKgPerWeek: Math.min(MAX_RATE_KG_PER_WEEK, Math.max(0.25, rate)),
    updatedAt: typeof r["updatedAt"] === "string" ? r["updatedAt"] : "",
  };
}

export interface WeighIn {
  date: string;
  kg: number;
}

export function parseWeighIns(raw: unknown): WeighIn[] {
  if (!Array.isArray(raw)) return [];
  const out: WeighIn[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    const date = r["date"];
    const kg = r["kg"];
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (typeof kg !== "number" || !Number.isFinite(kg) || kg < 25 || kg > 350) continue;
    out.push({ date, kg: Math.round(kg * 10) / 10 });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-365);
}

/**
 * A gentle BMI marker position (0–1) across a readable 15–40 scale, so the
 * visual can show where someone sits without implying a target line.
 */
export function bmiScalePosition(bmi: number): number {
  return Math.max(0, Math.min(1, (bmi - 15) / 25));
}
