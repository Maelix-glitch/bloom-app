/**
 * Nutrition — the gravy-style derivation (plan method 14).
 *
 * The accompaniment rule (see plan.ts) serves a base beside a main
 * dish that arrives IN a sauce — a curry, a dal, a masala the main
 * ingredient finishes in — because that is the plate a person
 * actually eats: the sauce needs something to carry it. Whether a
 * dish is such a dish is DERIVED here, deterministically, from the
 * dish's own recipe — its ingredient lines and its method text —
 * never from its name, never from its category beyond the main
 * slot it must fill, and never from a guess about its cuisine.
 * The derivation follows the house precedent of ./dishTags: the
 * method is the dish, and the corpus was read before the rules
 * were written (census over all 755 shipped mains, 2026-11-20).
 *
 * A main dish is gravy-style when ALL of these hold:
 *
 *  1. It does not already carry its base: a dish whose own lines
 *     hold a cereal grain — the rices and quinoa, or the same
 *     grains in their worked forms: semolina (pasta), the wheat
 *     and rice flours (flatbreads, dumplings, noodles, crusts),
 *     cornmeal (tortillas, arepas, grits), barley, oats, rye,
 *     buckwheat, millet — at ≥ 25 g a serving (dry basis) is a
 *     complete plate — a plov, a khichdi-style main, a pasta in
 *     its sauce. Serving a second base beside it would double
 *     the starch, not complete the plate. (The worked forms were
 *     added by M-261, 2026-11-28: the first census read only
 *     whole grains, so a bolognese — 70 g of pasta a serving in
 *     its own lines — was served steamed rice beside the pasta.)
 *  2. Its method does not dry it off: a sauce the method itself
 *     finishes dry ("until the masala clings dry", "cook until
 *     the sauce is dry") is a coating, not a gravy — the pepper
 *     fries are the corpus's own example, and their methods say
 *     so in words.
 *  3. It is not a dry-cooked plate with a sauce on the side: a
 *     skewer / tandoor / grill finish vetoes the weakest cue
 *     (the wet simmer below) — a souvlaki's yogurt is a marinade
 *     and a dip, not a sauce the meat cooks in. The veto yields
 *     to the two cues that describe the finished plate: a method
 *     that names its gravy, or finishes the protein in a masala,
 *     is describing a sauced dish however the protein started
 *     (the tikka masala route: grilled first, finished in the
 *     sauce).
 *  4. Its method speaks of the sauce in one of three ways:
 *     · the gravy word: the method names the dish's gravy
 *       ("the gravy is pale, silky", "poach in the yakhni
 *       gravy") — the corpus's unambiguous form;
 *     · the masala medium: the main ingredient is cooked INTO
 *       or IN a masala, or the masala is spooned over it and it
 *       finishes covered ("cook into a thick masala", "in the
 *       masala's juices", "spoon the masala over it, cover") —
 *       the semi-thick curries and masala sabzis;
 *     · a wet simmer: a step simmers (a simmer in plain water —
 *       beans boiling — does not count) AND the recipe carries a
 *       sauce base at ≥ 15 g a serving among its lines (tomato,
 *       the yogurts, coconut milk, fresh coconut, whole milk):
 *       the dals, sambars, rasams and coconut curries, whose
 *       methods simmer the dish in its sauce without ever
 *       naming it "gravy".
 *
 * Known soft edges, recorded rather than papered over: a handful
 * of simmered soups and stews (a lentil soup is structurally a
 * dal's cousin) pass the wet-simmer cue and are served a base —
 * a base beside a soup is an unusual plate, not a broken one,
 * and the alternative (reading dish names for "soup") is the
 * guessing this derivation exists to avoid. Semi-dry masalas
 * whose methods toss the main ingredient in a thick masala to
 * coat it (bhindi masala) count as gravy-style: on the plate
 * they are eaten with a base, and the corpus's dry veto (rule 2)
 * is what keeps the true fries out. In the other direction, a
 * water-based curry whose method never names a gravy or a
 * masala and whose lines carry no sauce base (a Japanese-style
 * curry, a jungle curry) is missed — precision is bought with
 * those few recalls, deliberately. (An earlier note here held
 * the bunny chow up as a dish rule 1 could not see; that
 * predates the dish's re-authoring — its lines DO carry the
 * bread bowl as wheat flour, 80 g a serving, and since M-261
 * rule 1 sees it and the curry is served no second base.)
 * One boundary is deliberate, not an oversight: chickpea flour
 * (besan) is NOT in the grain set. It is a legume flour, and in
 * the dishes that carry it heavily it either forms the gravy
 * itself (the kadhis, where it is whisked into the yogurt) or
 * forms protein dumplings eaten with a base (gatte, shiro wat
 * with injera) — those dishes keep their base, correctly.
 */

import type { Dish } from "./dishes";

/** The sauce-base foods, by USDA reference id: tomato, plain
 *  yogurt, Greek yogurt, coconut milk, fresh coconut, whole
 *  milk. A recipe line naming one of these is a line of sauce
 *  waiting to happen; the wet-simmer cue asks for at least
 *  SAUCE_BASE_MIN_G_PER_SERVING of them (per serving) before it
 *  believes the simmer is in a sauce. */
const SAUCE_BASE_FOOD_IDS: ReadonlySet<string> = new Set([
  "usda-170457", // tomato
  "usda-2259793", // yogurt, plain
  "usda-330137", // yogurt, Greek
  "usda-170172", // coconut milk
  "usda-170169", // coconut, fresh
  "usda-322892", // milk, whole
]);

/** The grain foods, by USDA reference id (dry basis): the cereal
 *  grains and the forms a kitchen works them into — pasta,
 *  flatbreads, dumplings, noodles and crusts are grains wearing
 *  another shape, and a dish carrying one at ≥ OWN_GRAIN_MIN_G_
 *  PER_SERVING already includes its base in its own recipe. The
 *  worked forms joined the set with M-261 (2026-11-28), after a
 *  census over the shipped library found 124 mains carrying an
 *  unseen grain at the floor or above, 29 of them being served a
 *  second base. The ≥ 25 g floor is what keeps a sauce's spoon
 *  of thickening flour out of this set's reach. Chickpea flour
 *  is absent on purpose (see the header): a legume flour is not
 *  a plate's base. */
const GRAIN_FOOD_IDS: ReadonlySet<string> = new Set([
  "usda-2512381", // rice, white, long grain
  "usda-2512380", // rice, brown, long grain
  "usda-2710825", // rice, black
  "usda-168874", // quinoa
  "usda-168933", // semolina — the pasta in pasta dishes
  "usda-168936", // wheat flour, white — flatbreads, dumplings, noodles, crusts
  "usda-168893", // wheat flour, whole-grain — noodles, dumplings
  "usda-169714", // rice flour — rice noodles, rolls, pidi dumplings
  "usda-168867", // cornmeal — tortillas, arepas, grits, sadza
  "usda-170284", // barley, pearled — the body of barley soups and stews
  "usda-2346396", // oats, rolled — oat-bodied meatballs and bakes
  "usda-168886", // rye flour — rye breads and sour rye soups
  "usda-2512378", // buckwheat, whole grain
  "usda-2512379", // millet, whole grain
]);

/** The wet-simmer cue's sauce-base floor, grams per serving:
 *  below it the wet line is a garnish or a marinade smear, not a
 *  sauce. A theeyal's roasted coconut at 15–20 g a serving is
 *  the sauce itself and clears it; the tuna salad's simmered
 *  beans never reach it because their simmer is in water, and
 *  the pepper fries are kept out by the dry finish above,
 *  whatever their tomato line says. */
export const SAUCE_BASE_MIN_G_PER_SERVING = 15;

/** The already-based floor, grams per serving (dry basis): a
 *  plov carries ~75 g of dry rice a serving; a curry that merely
 *  met rice flour or a spoon of cooked rice in a sauce stays
 *  well under this. */
export const OWN_GRAIN_MIN_G_PER_SERVING = 25;

const GRAVY_WORD = /\bgravy\b/;
const MASALA_MEDIUM =
  /into a (?:thick |dark,? jammy )?masala\b|to a (?:thick |dark,? jammy )?masala\b|\bin the masala\b|masala over|coat\w* (?:in|with) the masala/;
const SIMMER = /\bsimmer(?:s|ed|ing)?\b/;
const SIMMER_IN_WATER = /\bin (?:fresh |plenty of )?water\b/;
const DRY_FINISH =
  /clings? dry|until (?:the \w+ )?(?:is )?dry\b|dries off|dry and glossy|until dry\b/;
const DRY_COOK = /\bskewers?\b|\btandoor\b|\bgrill(?:s|ed|ing)?\b/;

function gramsPerServing(dish: Dish, ids: ReadonlySet<string>): number {
  let grams = 0;
  for (const line of dish.lines) {
    if (ids.has(line.foodId)) grams += line.grams;
  }
  return grams / dish.servings;
}

/**
 * Is this dish a gravy-style main — a dish that arrives in a
 * sauce and is eaten with a base? Pure and deterministic: the
 * same recipe always derives the same answer, which is what
 * makes the pinned census in gravyStyle.test.ts a check rather
 * than a matter of taste. Only main dishes are judged; every
 * other category answers false (a rice dish IS a base-bearing
 * plate, a bread is a base, and the snack and breakfast slots
 * never take an accompaniment).
 */
export function dishIsGravyStyle(dish: Dish): boolean {
  if (dish.category !== "main") return false;
  /* Rule 1: already based — the dish's own grain is its base. */
  if (gramsPerServing(dish, GRAIN_FOOD_IDS) >= OWN_GRAIN_MIN_G_PER_SERVING) return false;
  const steps = dish.method.map((s) => s.toLowerCase());
  const text = steps.join(" ");
  /* Rule 2: the method dries the sauce off — a coating, not a
     gravy, whatever else the method says. */
  if (DRY_FINISH.test(text)) return false;
  const gravyWord = GRAVY_WORD.test(text);
  const masalaMedium = MASALA_MEDIUM.test(text);
  const wetSimmer =
    steps.some((s) => SIMMER.test(s) && !SIMMER_IN_WATER.test(s)) &&
    gramsPerServing(dish, SAUCE_BASE_FOOD_IDS) >= SAUCE_BASE_MIN_G_PER_SERVING;
  /* Rule 3: a dry-cooked finish vetoes the weakest cue (the wet
     simmer); it yields to the two cues that describe the finished
     plate — a method that names the dish's gravy, or finishes the
     protein in a masala, is describing a sauced dish however the
     protein was started (the tikka masala route: grilled first,
     finished in the sauce). */
  if (DRY_COOK.test(text) && !gravyWord && !masalaMedium) return false;
  /* Rule 4: the method speaks of the sauce. */
  return gravyWord || masalaMedium || wetSimmer;
}
