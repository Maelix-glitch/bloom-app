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
 * (Mifflin–St Jeor for BMR, 35 ml/kg for water) and every screen that shows
 * them says what they are: an estimate, not a prescription. Nothing here
 * diagnoses anything, and the calorie target has a safety floor so a very
 * aggressive rate can never produce a dangerously low number.
 */

export type BodyUnits = "metric" | "imperial";
export type BodySex = "female" | "male" | "unspecified";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very-active";
export type BodyGoal = "lose" | "maintain" | "gain";

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

export function bmiBandOf(bmi: number): BmiBand {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "healthy";
  if (bmi < 30) return "overweight";
  return "obese";
}

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
  const max = round(24.9 * (heightCm / 100) ** 2, 1);
  const bmr = bmrOf(profile)!;
  const tdee = round(bmr * ACTIVITY_FACTOR[profile.activity]);

  const rate = Math.min(1, Math.max(0.25, profile.rateKgPerWeek || 0.5));
  const rawDelta = profile.goal === "maintain" ? 0 : round((rate * 7700) / 7);
  const rawCalories = profile.goal === "lose" ? tdee - rawDelta : profile.goal === "gain" ? tdee + rawDelta : tdee;
  const floor = calorieFloor(profile.sex);
  const floorApplied = rawCalories < floor;
  const calories = Math.max(floor, Math.min(4500, round(rawCalories)));

  const proteinPerKg = profile.goal === "lose" ? 1.8 : profile.goal === "gain" ? 1.6 : 1.4;
  const proteinG = round(weightKg * proteinPerKg);

  /* 35 ml/kg is the common adult maintenance estimate; activity adds a
     modest allowance. Capped so a very high weight doesn't produce an
     implausible "drink 7 litres" instruction. */
  const activityBonus =
    profile.activity === "sedentary"
      ? 0
      : profile.activity === "light"
        ? 250
        : profile.activity === "moderate"
          ? 500
          : profile.activity === "active"
            ? 750
            : 1000;
  const waterMl = Math.round(Math.min(4500, Math.max(1500, weightKg * 35 + activityBonus)) / 50) * 50;

  const targetWeightKg =
    profile.targetWeightKg && profile.targetWeightKg >= 30
      ? profile.targetWeightKg
      : profile.goal === "maintain"
        ? weightKg
        : null;

  let weeksToGoal: number | null = null;
  let goalDate: string | null = null;
  if (targetWeightKg && profile.goal !== "maintain") {
    const diff = Math.abs(weightKg - targetWeightKg);
    if (diff >= 0.2 && rate > 0) {
      weeksToGoal = Math.ceil(diff / rate);
      const date = new Date(`${today}T12:00:00`);
      date.setDate(date.getDate() + weeksToGoal * 7);
      goalDate = date.toISOString().slice(0, 10);
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
  const goal = (["lose", "maintain", "gain"] as BodyGoal[]).includes(r["goal"] as BodyGoal)
    ? (r["goal"] as BodyGoal)
    : "maintain";
  const rate = typeof r["rateKgPerWeek"] === "number" ? r["rateKgPerWeek"] : 0.5;
  return {
    units,
    heightCm: numOrNull(r["heightCm"], 100, 250),
    weightKg: numOrNull(r["weightKg"], 25, 350),
    targetWeightKg: numOrNull(r["targetWeightKg"], 25, 350),
    age: numOrNull(r["age"], 13, 110),
    sex,
    activity,
    goal,
    rateKgPerWeek: Math.min(1, Math.max(0.25, rate)),
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
