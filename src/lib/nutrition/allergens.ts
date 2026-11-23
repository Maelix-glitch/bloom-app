/**
 * Structured allergen protection (M-219, audit F-10).
 *
 * Before M-219, allergy filtering was free-text substring matching of
 * the person's own words against food names. Its failure mode was
 * silent and dangerous in both directions: "nuts" did not match
 * almond, cashew or walnut (the allergy simply did not apply), and
 * "peanut" did not match groundnut. A safety-named feature cannot
 * rest on whether two strings happen to overlap.
 *
 * The model now:
 *   · ALLERGENS are a closed set of stable codes (the FSSAI scheduled
 *     allergen families), never free text.
 *   · A declared allergy term is interpreted ONCE, here
 *     (`allergensForTerm`): a recognised term becomes allergen codes;
 *     an unrecognised term returns null and the caller keeps the old
 *     substring matching as a backstop for that term only — a word
 *     Bloom cannot interpret is never silently dropped.
 *   · A food's allergens are DERIVED (`foodAllergenState`) from facts
 *     Bloom actually holds: the classification flags (dairy, egg,
 *     fish) and a pinned identity-token table for the families the
 *     flags cannot express (peanut, tree nuts, sesame, soy, gluten
 *     grains, shellfish). Identity tokens match whole name tokens, so
 *     "wheat" fires on wheat flour and never on buckwheat.
 *   · A food Bloom cannot derive allergens for (a user-entered food —
 *     no classification) is UNVERIFIED. Against a declared structured
 *     allergen, unverified fails CLOSED in the plan pool: Bloom does
 *     not plan with food it cannot clear. The state is exported so a
 *     surface can say "not verified" instead of guessing.
 *
 * Derivation limits, stated plainly: this judges a food's own
 * identity, not factory cross-contact, and not a composite dish's
 * hidden ingredients beyond its lines — a dish is judged line by
 * line through the same pool, so every ingredient Bloom knows about
 * is judged; an ingredient Bloom does not know about cannot be in a
 * planned dish at all (the pool's provenance gate sees to that).
 * Peanut oil is flagged with peanut: refined oil is often exempt in
 * labelling law, but a self-serve planner errs toward exclusion.
 * Coconut is not classed as a tree nut here (its allergen status is
 * contested and it is a staple of the launch cuisine); oats are not
 * classed as a gluten grain (their risk is cross-contact, not
 * intrinsic gluten).
 */

import type { Food } from "./types";

export const ALLERGENS = [
  "peanut",
  "tree_nut",
  "milk",
  "egg",
  "gluten",
  "soy",
  "fish",
  "shellfish",
  "sesame",
] as const;

export type AllergenId = (typeof ALLERGENS)[number];

export const ALLERGEN_LABEL: Record<AllergenId, string> = {
  peanut: "peanut",
  tree_nut: "tree nuts",
  milk: "milk",
  egg: "egg",
  gluten: "gluten",
  soy: "soy",
  fish: "fish",
  shellfish: "shellfish",
  sesame: "sesame",
};

/* ------------------------- term interpretation ------------------------ */

const TERM_MAP: Readonly<Record<string, readonly AllergenId[]>> = {
  peanut: ["peanut"],
  peanuts: ["peanut"],
  groundnut: ["peanut"],
  groundnuts: ["peanut"],
  nut: ["tree_nut", "peanut"],
  nuts: ["tree_nut", "peanut"],
  "tree nut": ["tree_nut"],
  "tree nuts": ["tree_nut"],
  almond: ["tree_nut"],
  almonds: ["tree_nut"],
  cashew: ["tree_nut"],
  cashews: ["tree_nut"],
  walnut: ["tree_nut"],
  walnuts: ["tree_nut"],
  hazelnut: ["tree_nut"],
  hazelnuts: ["tree_nut"],
  pistachio: ["tree_nut"],
  pistachios: ["tree_nut"],
  pecan: ["tree_nut"],
  pecans: ["tree_nut"],
  macadamia: ["tree_nut"],
  chestnut: ["tree_nut"],
  chestnuts: ["tree_nut"],
  milk: ["milk"],
  dairy: ["milk"],
  lactose: ["milk"],
  egg: ["egg"],
  eggs: ["egg"],
  gluten: ["gluten"],
  wheat: ["gluten"],
  soy: ["soy"],
  soya: ["soy"],
  soybean: ["soy"],
  soybeans: ["soy"],
  fish: ["fish"],
  shellfish: ["shellfish"],
  shrimp: ["shellfish"],
  shrimps: ["shellfish"],
  prawn: ["shellfish"],
  prawns: ["shellfish"],
  crab: ["shellfish"],
  sesame: ["sesame"],
};

/**
 * Interpret one declared allergy term. Returns the allergen codes it
 * names, or null when the term names none of the scheduled families
 * (the caller then falls back to substring matching for that term).
 */
export function allergensForTerm(term: string): readonly AllergenId[] | null {
  const key = term.trim().toLowerCase().replace(/\s+/g, " ");
  return TERM_MAP[key] ?? null;
}

/** The declared allergies of a profile, split by how they are judged. */
export function declaredAllergens(allergies: readonly string[]): {
  /** Structured allergen codes named by at least one recognised term. */
  structured: ReadonlySet<AllergenId>;
  /** Terms Bloom could not interpret — judged by substring backstop. */
  unmappedTerms: string[];
} {
  const structured = new Set<AllergenId>();
  const unmappedTerms: string[] = [];
  for (const raw of allergies) {
    const mapped = allergensForTerm(raw);
    if (mapped) {
      for (const allergen of mapped) structured.add(allergen);
    } else {
      const term = raw.trim().toLowerCase();
      if (term.length >= 3) unmappedTerms.push(term);
    }
  }
  return { structured, unmappedTerms };
}

/* --------------------------- food derivation -------------------------- */

/** Whole name tokens → the allergen family the token identifies.
 *  Only families the classification flags cannot express live here;
 *  milk, egg and fish come from the flags themselves. */
const TOKEN_ALLERGENS: Readonly<Record<string, AllergenId>> = {
  peanut: "peanut",
  peanuts: "peanut",
  groundnut: "peanut",
  groundnuts: "peanut",
  almond: "tree_nut",
  almonds: "tree_nut",
  cashew: "tree_nut",
  cashews: "tree_nut",
  walnut: "tree_nut",
  walnuts: "tree_nut",
  hazelnut: "tree_nut",
  hazelnuts: "tree_nut",
  pistachio: "tree_nut",
  pistachios: "tree_nut",
  pecan: "tree_nut",
  pecans: "tree_nut",
  macadamia: "tree_nut",
  chestnut: "tree_nut",
  chestnuts: "tree_nut",
  sesame: "sesame",
  til: "sesame",
  gingelly: "sesame",
  soy: "soy",
  soya: "soy",
  soybean: "soy",
  soybeans: "soy",
  tofu: "soy",
  edamame: "soy",
  wheat: "gluten",
  barley: "gluten",
  rye: "gluten",
  spelt: "gluten",
  semolina: "gluten",
  maida: "gluten",
  atta: "gluten",
  rava: "gluten",
  shrimp: "shellfish",
  shrimps: "shellfish",
  prawn: "shellfish",
  prawns: "shellfish",
  crab: "shellfish",
  lobster: "shellfish",
};

export type FoodAllergenState =
  | { readonly kind: "known"; readonly allergens: ReadonlySet<AllergenId> }
  | { readonly kind: "unverified" };

/**
 * A food's allergen state, derived from its classification flags and
 * its name's identity tokens. `unverified` exactly when the food
 * carries no classification — Bloom does not claim to know what is
 * in a food it did not curate.
 */
export function foodAllergenState(food: Food): FoodAllergenState {
  const classification = food.classification;
  if (!classification) return { kind: "unverified" };
  const allergens = new Set<AllergenId>();
  if (classification.containsDairy) allergens.add("milk");
  if (classification.containsEgg) allergens.add("egg");
  if (classification.isFish) allergens.add("fish");
  for (const token of food.name.toLowerCase().split(/[^a-z]+/)) {
    const allergen = TOKEN_ALLERGENS[token];
    if (allergen) allergens.add(allergen);
  }
  return { kind: "known", allergens };
}

/**
 * True when the food must be kept from a person with the declared
 * structured allergens: it carries one of them, or its allergens are
 * unverified while any structured allergen is declared (fail closed).
 */
export function foodExcludedByAllergens(
  food: Food,
  structured: ReadonlySet<AllergenId>,
): boolean {
  if (structured.size === 0) return false;
  const state = foodAllergenState(food);
  if (state.kind === "unverified") return true;
  for (const allergen of structured) {
    if (state.allergens.has(allergen)) return true;
  }
  return false;
}
