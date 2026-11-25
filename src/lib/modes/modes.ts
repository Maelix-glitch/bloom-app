/**
 * Condition Modes (System 14) — user-chosen plan guardrails.
 *
 * A mode is a GUARDRAIL, never a diagnosis and never medical advice:
 * Bloom does not know whether the person has any condition, and
 * nothing here claims a dish is good or bad for one. A mode is on
 * when the person switches it on, or — since M-219 — when their own
 * Assessment answer auto-enables it (see CONDITION_AUTO_MODES).
 * Each mode is a small set of mechanical rules over data Bloom actually
 * has, stated in the same plain words the UI shows:
 *
 *   · Blood-sugar aware — this mode does not judge sugar grams.
 *     (When the mode was written, Bloom's food data carried no sugar
 *     values at all; since M-244 many foods report total sugars, but
 *     coverage is partial — a dish's sugar total can be a floor over
 *     the ingredients that reported it — so the mode's rules stay
 *     with what is complete: ) whether a dish's ingredients include
 *     an added sugar (granulated sugar or honey, named reference
 *     foods), and the dish's computed carbohydrate per serving.
 *   · Blood-pressure aware — sodium is computed per serving for every
 *     library dish (salt is an ingredient line), so this mode hides
 *     dishes over a stated sodium-per-serving limit. A dish whose
 *     ingredients do not report sodium is never judged — absent is
 *     not zero, the nutrition module's own absence rule.
 *   · Thyroid aware — Bloom's data carries no iodine and no selenium,
 *     so NO dish rule can be computed honestly. This mode is
 *     information only: it hides nothing, and the UI says why.
 *
 * Composition: modes sit ON the plan composer's own seam — inside
 * `dishPoolFor`, after the dietary-pattern and budget gates, a dish
 * must also pass every active mode. An excluded dish can always name
 * the rule that excluded it (`ModeExclusion.reason`), in the same
 * words the UI uses.
 *
 * Storage is a versioned prefs key, `health.modes.v1`, in the shared
 * preferences document — sync, export (loadDoc() wholesale) and
 * erasure (device wipe + erase_my_data() on user_prefs) are inherited
 * by construction, the targetAdjustment pattern.
 */

import { clearPref, getPref, setPref } from "@/lib/prefs";
import type { Dish } from "@/lib/nutrition/dishes";
import type { Nutrients } from "@/lib/nutrition/types";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";

/* ------------------------------ definitions ------------------------------ */

export type ModeId = "blood_sugar" | "blood_pressure" | "thyroid";

/**
 * A rule, as data. Each kind is judged by `judgeRule` below against a
 * dish and its computed per-serving nutrients — nothing else about the
 * dish is consulted, so the rule set is exactly what this table says.
 */
export type ModeRule =
  | { id: string; kind: "added_sugar_ingredient" }
  | { id: string; kind: "max_carbs_per_serving"; limitG: number }
  | { id: string; kind: "max_sodium_per_serving"; limitMg: number };

export interface ModeDefinition {
  id: ModeId;
  /** The person's name for the mode — a preference label, not a condition claim. */
  name: string;
  /** What the mode does, mechanically, in one plain sentence per rule. */
  ruleLines: readonly string[];
  /** True when the mode carries no dish rules (today's data cannot support any). */
  informationOnly: boolean;
  /** For an information-only mode: why it cannot check dishes, stated plainly. */
  dataNote?: string;
  rules: readonly ModeRule[];
}

/** The carbohydrate-per-serving limit for the blood-sugar mode, grams.
 *  Stated, mechanical — not a medical threshold. */
export const BLOOD_SUGAR_CARB_LIMIT_G = 75;
/** The sodium-per-serving limit for the blood-pressure mode, mg.
 *  Stated, mechanical — not a medical threshold. */
export const BLOOD_PRESSURE_SODIUM_LIMIT_MG = 800;

export const MODE_DEFINITIONS: readonly ModeDefinition[] = [
  {
    id: "blood_sugar",
    name: "Blood-sugar aware",
    ruleLines: [
      "Hides dishes whose ingredients include added sugar (granulated sugar or honey).",
      `Hides dishes with more than ${BLOOD_SUGAR_CARB_LIMIT_G} g of carbohydrate in a serving.`,
    ],
    informationOnly: false,
    rules: [
      { id: "added-sugar-ingredient", kind: "added_sugar_ingredient" },
      { id: "carbs-per-serving", kind: "max_carbs_per_serving", limitG: BLOOD_SUGAR_CARB_LIMIT_G },
    ],
  },
  {
    id: "blood_pressure",
    name: "Blood-pressure aware",
    ruleLines: [
      `Hides dishes with more than ${BLOOD_PRESSURE_SODIUM_LIMIT_MG} mg of sodium in a serving.`,
    ],
    informationOnly: false,
    rules: [
      { id: "sodium-per-serving", kind: "max_sodium_per_serving", limitMg: BLOOD_PRESSURE_SODIUM_LIMIT_MG },
    ],
  },
  {
    id: "thyroid",
    name: "Thyroid aware",
    ruleLines: [],
    informationOnly: true,
    dataNote:
      "Bloom's food data doesn't include iodine or selenium, so this mode can't check dishes yet. It hides nothing.",
    rules: [],
  },
];

export function modeDefinition(id: ModeId): ModeDefinition {
  return MODE_DEFINITIONS.find((m) => m.id === id)!;
}

/**
 * Assessment conditions that auto-enable a Mode (M-219, audit F-12).
 * Before M-219 the structured condition list held only the five
 * high-risk codes, and the common metabolic conditions — type 2
 * diabetes, hypertension, thyroid disorders — existed only as free
 * text while the Modes that answer them sat as opt-in toggles the
 * person had to discover. Now an honest Assessment answer switches
 * the matching guardrail on by itself. PCOS has no Mode: Bloom's data
 * supports no honest dish rule for it, so it carries the safety
 * caution only — inventing a rule would be worse than none.
 */
export const CONDITION_AUTO_MODES: Readonly<Record<string, ModeId>> = {
  type_2_diabetes: "blood_sugar",
  hypertension: "blood_pressure",
  thyroid_disorder: "thyroid",
};

/** The Modes a person's stated conditions switch on by themselves. */
export function autoModesForConditions(conditions: readonly string[]): ModeId[] {
  const out: ModeId[] = [];
  for (const code of conditions) {
    const mode = CONDITION_AUTO_MODES[code];
    if (mode && !out.includes(mode)) out.push(mode);
  }
  return out;
}

/** Stored (opt-in) modes ∪ answer-derived modes, in definition order. */
export function effectiveModes(
  storedActive: readonly ModeId[],
  conditions: readonly string[],
): ModeId[] {
  const wanted = new Set<ModeId>([...storedActive, ...autoModesForConditions(conditions)]);
  return MODE_DEFINITIONS.map((m) => m.id).filter((id) => wanted.has(id));
}

export function isModeId(value: unknown): value is ModeId {
  return value === "blood_sugar" || value === "blood_pressure" || value === "thyroid";
}

/* --------------------------- added-sugar identity -------------------------- */

/**
 * The reference foods that ARE added sugars, by identity — the same
 * ingredient-fact style the dietary-pattern filters use, never a
 * nutrient guess. Bloom's data carries no sugar values, so identity
 * is the only honest sugar signal; the set is exactly the sweetener
 * foods in the curated USDA reference set.
 */
export const ADDED_SUGAR_FOODS: readonly { foodId: string; name: string }[] = [
  { foodId: "usda-334247", name: "granulated sugar" },
  { foodId: "usda-169640", name: "honey" },
];

const ADDED_SUGAR_IDS: ReadonlyMap<string, string> = new Map(
  ADDED_SUGAR_FOODS.map((f) => [f.foodId, f.name]),
);

/* -------------------------------- judging -------------------------------- */

export interface ModeExclusion {
  modeId: ModeId;
  ruleId: string;
  /** The rule, naming the dish's own computed value — the UI's words. */
  reason: string;
}

function judgeRule(rule: ModeRule, dish: Dish, nutrients: Nutrients): string | null {
  switch (rule.kind) {
    case "added_sugar_ingredient": {
      for (const line of dish.lines) {
        const name = ADDED_SUGAR_IDS.get(line.foodId);
        if (name) return `Added sugar in the ingredients (${name})`;
      }
      return null;
    }
    case "max_carbs_per_serving": {
      return nutrients.carbsG > rule.limitG
        ? `${Math.round(nutrients.carbsG)} g of carbohydrate in a serving, over this mode's ${rule.limitG} g limit`
        : null;
    }
    case "max_sodium_per_serving": {
      /* Absent sodium is never judged: the ingredients did not report
       * it, so the dish's sodium is unknown, not zero. */
      if (typeof nutrients.sodiumMg !== "number") return null;
      return nutrients.sodiumMg > rule.limitMg
        ? `${Math.round(nutrients.sodiumMg)} mg of sodium in a serving, over this mode's ${rule.limitMg} mg limit`
        : null;
    }
  }
}

/**
 * Every reason the active modes exclude this dish — empty when the
 * dish passes all of them. A dish must pass pattern, budget AND modes;
 * this is the modes layer only.
 */
export function modeExclusionsFor(
  dish: Dish,
  nutrients: Nutrients,
  activeModes: readonly ModeId[],
): ModeExclusion[] {
  const out: ModeExclusion[] = [];
  for (const modeId of activeModes) {
    const def = modeDefinition(modeId);
    for (const rule of def.rules) {
      const reason = judgeRule(rule, dish, nutrients);
      if (reason) out.push({ modeId, ruleId: rule.id, reason });
    }
  }
  return out;
}

export function dishPassesModes(
  dish: Dish,
  nutrients: Nutrients,
  activeModes: readonly ModeId[],
): boolean {
  return modeExclusionsFor(dish, nutrients, activeModes).length === 0;
}

/** The modes layer over plan/browse candidates ({dish, nutrients} pairs). */
export function filterByModes<T extends { dish: Dish; nutrients: Nutrients }>(
  candidates: readonly T[],
  activeModes: readonly ModeId[],
): T[] {
  if (activeModes.length === 0) return [...candidates];
  return candidates.filter((c) => dishPassesModes(c.dish, c.nutrients, activeModes));
}

/**
 * How many dishes of a set each active mode hides — the UI's effect
 * summary, computed from the real set it is handed (the dish library),
 * never estimated. Modes with no rules hide zero, stated as such.
 */
export function modeHiddenCounts(
  dishes: readonly { dish: Dish; nutrients: Nutrients }[],
  activeModes: readonly ModeId[],
): ReadonlyMap<ModeId, number> {
  const counts = new Map<ModeId, number>();
  for (const modeId of activeModes) {
    counts.set(
      modeId,
      dishes.filter((d) => modeExclusionsFor(d.dish, d.nutrients, [modeId]).length > 0).length,
    );
  }
  return counts;
}

/* --------------------------------- storage -------------------------------- */

export const MODES_KEY = "health.modes.v1";
export const MODES_VERSION = 1;

export interface ModesValue {
  version: typeof MODES_VERSION;
  active: ModeId[];
}

export const EMPTY_MODES_VALUE: ModesValue = { version: MODES_VERSION, active: [] };

/** Strict parser: unknown ids are dropped, never honoured; anything
 *  malformed reads as no modes on. */
export function parseModesValue(raw: unknown): ModesValue | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== MODES_VERSION) return null;
  if (!Array.isArray(r["active"])) return null;
  const active: ModeId[] = [];
  for (const item of r["active"]) {
    if (isModeId(item) && !active.includes(item)) active.push(item);
  }
  return { version: MODES_VERSION, active };
}

export function readModes(): ModesValue {
  return getPref(MODES_KEY, parseModesValue, EMPTY_MODES_VALUE);
}

export function writeModes(active: readonly ModeId[]): void {
  const clean: ModeId[] = [];
  for (const id of active) if (isModeId(id) && !clean.includes(id)) clean.push(id);
  if (clean.length === 0) {
    clearPref(MODES_KEY);
    return;
  }
  setPref(MODES_KEY, { version: MODES_VERSION, active: clean } satisfies ModesValue);
}

/** Sanity anchor for the data layer: every added-sugar food id must
 *  exist in the reference set it names — a renamed food must fail a
 *  test, not silently stop the rule. */
export function addedSugarFoodsResolve(): boolean {
  return ADDED_SUGAR_FOODS.every((f) => USDA_REFERENCE_FOODS.some((food) => food.id === f.foodId));
}
