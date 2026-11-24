/**
 * Nutrition — core shapes (W4-3, design §4.1).
 *
 * A Food is a reusable item with per-100 g values and a provenance that is
 * part of the type, not a display afterthought: a nutrient number in Bloom
 * never travels without where it came from. Optional nutrients (fibre,
 * sodium) exist only when the source actually provides them — they are
 * absent, never zero-filled guesses.
 *
 * A LogEntry is one eaten instance. It stores its computed nutrients (not
 * just a food reference) so history stays stable if a food is later edited —
 * the same append-only instinct as the evidence registry.
 */

export interface Nutrients {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Only when the source provides it. Absent is not zero. */
  fibreG?: number;
  /** Only when the source provides it. Absent is not zero. */
  sodiumMg?: number;
  /**
   * The micronutrient panel (N-UI): potassium, magnesium, calcium, iron
   * and vitamin C, in milligrams. Same absence rule as fibre and sodium —
   * a field exists only when the source published it for that food;
   * absent means "not reported", never zero. USDA reference foods carry
   * them where FoodData Central publishes them; a user's own foods and
   * Coach estimates carry only what was actually stated for them.
   */
  potassiumMg?: number;
  magnesiumMg?: number;
  calciumMg?: number;
  ironMg?: number;
  vitaminCMg?: number;
}

/** The optional nutrient fields — everything beyond the core four. A day
 *  total can be INCOMPLETE in any of these: at least one logged food did
 *  not report it, so the total is a floor, not a claim. */
export const OPTIONAL_NUTRIENT_KEYS = [
  "fibreG",
  "sodiumMg",
  "potassiumMg",
  "magnesiumMg",
  "calciumMg",
  "ironMg",
  "vitaminCMg",
] as const;

export type OptionalNutrientKey = (typeof OPTIONAL_NUTRIENT_KEYS)[number];

export type FoodProvenanceKind =
  | "usda"
  | "cofid"
  | "afcd"
  | "cnf"
  | "user_entered"
  | "off"
  | "ifct"
  | "recipe";

export interface FoodProvenance {
  kind: FoodProvenanceKind;
  /** The source's own id for this food (USDA fdcId, CoFID food code, OFF barcode, …). For a
   *  user-entered food, the food's own id. For a `recipe` provenance (a
   *  dish, D1), the dish's id — the values are computed from USDA
   *  ingredient data, and the label says so. */
  sourceId: string;
  /** USDA data type ("Foundation" | "SR Legacy" | "Branded"), when relevant. */
  dataType?: string;
  /** The source's display label, as shipped by the source. */
  label: string;
}

export interface FoodServing {
  /** User-meaningful label, e.g. "1 katori". The gram weight is explicit. */
  label: string;
  grams: number;
}

/**
 * Food groups for plan composition (P2), following the ICMR-NIN
 * Dietary Guidelines for Indians (2024) group framework as operationalised
 * in the balanced-diet composition research: one group per food, assigned
 * at the data layer — for the USDA reference set, by the generator's
 * pinned per-FDC-id classification, never guessed from a name at runtime.
 */
export type FoodGroup =
  | "cereals_grains"
  | "pulses_legumes"
  | "eggs"
  | "dairy"
  | "vegetables"
  | "fruits"
  | "nuts_seeds"
  | "fats_oils"
  | "other";

/**
 * A food's identity for dietary-pattern filtering, stated as ingredient
 * facts. Patterns are encoded on these flags, never on veg/non-veg
 * labels: FSSAI legally classes egg as non-vegetarian, so a label-based
 * filter would wrongly exclude eggs from an eggetarian plan (research
 * §6). `isFish` is split out of `isFlesh` because the pescatarian pattern
 * allows fish while excluding other flesh.
 */
export interface FoodClassification {
  group: FoodGroup;
  containsEgg: boolean;
  containsDairy: boolean;
  isFlesh: boolean;
  isFish: boolean;
}

/**
 * The preparation state a food record's per-100 g values describe
 * (Nutrition Intelligence spec §3.3/§4, module 06). In the shipped
 * reference set the pinning rule is: `raw` is reserved for the dry/raw
 * STAPLE basis — dry pulses, dry grains and flours, whose values
 * describe an ingredient that is cooked from dry before it is eaten,
 * so grams of the record are not grams on the plate. Fresh foods
 * portioned in the form they are bought (produce, eggs, flesh, fish,
 * nuts, dairy, oils — several of whose USDA descriptions also say
 * "raw", meaning fresh) are `as_purchased`: the gram quantity IS the
 * portion quantity. Manufactured prepared foods (tofu, tempeh) are
 * `cooked_unspecified`. The remaining states name cooked forms a
 * future cooked-form record may carry.
 */
export type PreparationState =
  | "raw"
  | "boiled"
  | "steamed"
  | "roasted"
  | "fried"
  | "cooked_unspecified"
  | "as_purchased";

export interface PreparationProfile {
  /** The state THIS record's per-100 g values describe. Absent on a
   *  food = state unclaimed, and the food may not be presented as a
   *  ready-to-eat portion where the basis matters (spec §4.4). */
  state: PreparationState;
  /** Cooked grams yielded by 100 g in this record's state, where a
   *  yield relation is known from a registered source (e.g. dry
   *  lentils → boiled). Absent = unknown, never defaulted to 100.
   *  No shipped food carries this yet: the yield sources are still
   *  TO VERIFY (spec §4.2), and an unsourced factor is not shipped. */
  yieldToCookedPer100g?: number;
  /** Edible fraction of the as-purchased weight, 0–1, where the source
   *  states one (peel, bone, shell). Absent = unknown. */
  ediblePortionShare?: number;
}

export interface Food {
  id: string;
  name: string;
  per100g: Nutrients;
  servings: FoodServing[];
  provenance: FoodProvenance;
  /**
   * Group + pattern identity. Present on reference foods, where the
   * classification is pinned at the data layer; absent on user-entered
   * foods — Bloom does not claim to know what is in a food it did not
   * curate, and the plan composer treats an unclassified food accordingly.
   */
  classification?: FoodClassification;
  /**
   * Preparation basis of the record's values. Present on reference
   * foods, pinned per FDC id in the generator like the classification;
   * absent on user-entered foods — unclaimed, by the same design as
   * the classification: Bloom does not invent a basis for a food it
   * did not curate.
   */
  preparation?: PreparationProfile;
}

/**
 * A Coach photo estimate is provenance for an entry, never for a reusable
 * Food — an estimate must not become reference data (design §4.4).
 */
export interface CoachEstimateProvenance {
  kind: "coach_estimate";
  label: string;
}

export type EntryProvenance = FoodProvenance | CoachEstimateProvenance;

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: readonly Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export type EntrySource = "search" | "custom" | "coach_photo" | "recent" | "plan" | "dish";

export type Amount = { grams: number } | { servings: number; servingLabel: string };

/** The inline copy an estimate entry carries — the estimated totals for the
 *  photographed portion, as the user confirmed them in the log sheet. */
export interface EstimateSnapshot {
  name: string;
  totals: Nutrients;
}

export interface LogEntry {
  id: string;
  /** Local day key (`YYYY-MM-DD`, via src/lib/localDay.ts conventions). */
  day: string;
  meal: Meal;
  /** The reusable Food this entry came from. Null for snapshot entries
   *  (Coach estimates, dishes). */
  foodId: string | null;
  /** Inline snapshot for estimate and dish entries — the portion's
   *  totals, stored with the entry. Null for food-backed entries. */
  snapshot: EstimateSnapshot | null;
  /** Display name captured at log time (the food's name, or the name the
   *  user gave an estimate). */
  name: string;
  amount: Amount;
  /** Computed at log time from per-100 g × amount, stored with the entry. */
  nutrients: Nutrients;
  /** Inherited from the food; `coach_estimate` for photo estimates. */
  provenance: EntryProvenance;
  source: EntrySource;
  createdAt: string;
}

export interface DayLog {
  day: string;
  entries: LogEntry[];
  totals: Nutrients;
}
