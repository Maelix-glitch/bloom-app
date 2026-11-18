/**
 * Nutrition — dish preparation tags (spec §10.4): the derivation.
 *
 * Every shipped dish carries `equipment` / `noCook` pins (see the Dish
 * type in ./dishes), and THIS module is where they come from: a
 * deterministic reading of the dish's OWN method text — never its
 * name, never its category, never a guess about the cuisine. The
 * generator (scripts/nutrition-dish-tags.mjs) pins what this function
 * derives into the data files; its --check mode and dishTags.test.ts
 * prove the pins and the derivation never drift apart.
 *
 * The rules, and the corpus evidence behind the sharp edges (the
 * method corpus was read before these were written — see
 * ~/workspace/bloom-dishtags-log.md):
 *
 * - oven: the word "oven"; the bake family — but not "baking
 *   soda/powder" (an ingredient), and not the noun uses ("shark and
 *   bake" is a dish's name, "the bakes" its breads), which are
 *   stripped before matching; "under a/the (hot) grill" — the
 *   broiler — UNLESS the method offers a flame in the same breath
 *   (baingan bharta: "over a flame or under a hot grill" — the flame
 *   route is the stove's, and pinning the oven too would demand both
 *   for a dish either route makes); "broil"; "bake/roast at <n>°"
 *   (a bare temperature is NOT a cue: "74°C" is a doneness check,
 *   never an oven setting).
 * - pressure_cooker: "pressure cook*", "pressure cooker",
 *   "whistle(s)". A pressure cooker works on a hob, so a pressure
 *   dish also pins the stove.
 * - microwave: the word itself. No shipped method uses one; the
 *   honest count is zero.
 * - mixer_grinder: blend/grind verb forms ("ground coriander" is an
 *   adjective and does not count; "ground to a paste" does), "food
 *   processor", and "purée" — unless the step negates it ("never a
 *   purée"). NOT pinned when the method itself offers a manual route
 *   in the same phrase — "(or blend …)", "blend or whisk/mash/stir",
 *   "pound or grind": a person with no machine can follow those
 *   methods exactly as written, so the machine is not a need.
 * - fridge: chill/chilled/chilling with word boundaries (so "chilli"
 *   can never match), refrigerat*, "fridge", freeze/freezer — the
 *   vocabulary's only cold item (mozzarella sticks freeze before
 *   they bake). NOT pinned for storage advice ("keeps 3 days in the
 *   fridge", "refrigerate for up to 3 days"): that is keeping a made
 *   dish, not making it.
 * - stove: the hob verbs (boil, simmer, the fry family, sauté,
 *   temper, steam, poach, braise, sear, toast, tadka, wilt, blanch,
 *   parboil, char), "dry-roast", the hob-vessel words (tawa, kadai,
 *   griddle, skillet, flame), a pan named in cooking position
 *   ("in/on a dry/hot/heavy pan"), a named heat ("over low heat",
 *   "on the lowest heat"), "soften … in (oil/butter/…)",
 *   grill verbs in steps that do not name the under-grill route
 *   (a grill pan or griddle on the hob is the corpus's dominant
 *   usage), and roast verbs no oven cue explains (pan roasts —
 *   "roast, stirring, in a heavy pan"; the adjective "roasted" is
 *   an ingredient state and is never a cue).
 * - Where a method offers two heat routes ("poach or bake", "fry, or
 *   bake at 200°"), BOTH are pinned: the kitchen gates can only
 *   require, never choose, and §10.4's direction is exclusion over
 *   wrongful inclusion.
 * - noCook ⟺ no cooking cue at all: no equipment heat cue and no
 *   generic heat verb (cook/heat/warm/melt). A cooked dish whose
 *   method names no recognisable equipment still pins ["stove"] —
 *   the conservative default `dishPreparationNeeds` answers for an
 *   unpinned dish, made explicit.
 *
 * Judged from the method alone, some familiar names land honestly
 * unintuitive: cucumber raita dry-roasts its cumin (stove), sprouts
 * chaat steams its sprouts (stove), the cooked-tempeh shakes are not
 * no-cook. The derivation does not care — the method is the dish.
 */

import type { EquipmentItem } from "@/lib/vitalis/domain/profile";
import type { Dish } from "./dishes";

/** The equipment a dish's method can need, in the domain vocabulary's
 *  own order (profile.ts EQUIPMENT_ITEMS minus "none", which is a
 *  person's answer, never a dish's need). Pinned as a literal here so
 *  this module stays type-only in its imports; dishTags.test.ts pins
 *  the two lists equal. */
export const DISH_EQUIPMENT_ORDER: readonly EquipmentItem[] = [
  "stove",
  "pressure_cooker",
  "oven",
  "microwave",
  "mixer_grinder",
  "fridge",
];

export interface DerivedDishTags {
  readonly equipment: readonly EquipmentItem[];
  readonly noCook: boolean;
}

const OVEN_WORD = /\boven\b/;
const BAKE = /\bbak(?:e|es|ed|ing)\b(?!\s+(?:soda|powder))/;
/* Noun uses of "bake" that name a bread or a dish, not the act:
   stripped before the bake family is judged. */
const BAKE_NOUN = /\bshark and bake\b|\bthe (?:warm |hot |fresh )?bakes?\b|\bthese bakes\b|\bmince bake\b/g;
const UNDER_GRILL = /\bunder (?:a |the )?(?:hot )?grill\b/;
const BROIL = /\bbroil(?:er|ed|ing|s)?\b/;
const HOT_TEMP = /\b(?:bake|roast) at \d+/;
const FLAME_ALT = /\bover (?:a |the |an )?flame\b/;
const PRESSURE = /\bpressure[-\s]cook(?:er|ed|ing|s)?\b|\bpressure cooker\b|\bwhistles?\b/;
const MICROWAVE = /\bmicrowave\b/;
const MIXER = /\bblend(?:s|ed|ing|er)?\b|\bgrind(?:s|ing|er)?\b|\bground to\b|\bfood processor\b/;
/* Phrases where the method itself offers a manual route instead of
   the machine — removed before the mixer verbs are judged. */
const MANUAL_ALTERNATIVE = /\(or blend[^)]*\)|\bblend or (?:whisk|mash|stir)\b|\bpound or grind\b|\bgrind or pound\b/g;
const PUREE = /\bpur[ée]e(?:s|d)?\b/;
const PUREE_NEGATED = /\b(?:never|not|no) a pur[ée]e\b/;
const FRIDGE = /\bchill(?:ed|ing)?\b|\brefrigerat\w*\b|\bfridge\b|\bfreez(?:e|er|ing)\b/;
const STORAGE_ADVICE = /\bkeeps\b|\bstor(?:e|ed|ing)\b|\bleftover|up to \d+ days/;
const STOVE_VERBS =
  /\b(?:boil(?:s|ed|ing)?|simmer(?:s|ed|ing)?|fr(?:y|ies|ied|ying)|sauté(?:s|ed|ing)?|saute(?:s|ed|ing)?|temper(?:s|ed|ing)?|steam(?:s|ed|ing)?|poach(?:es|ed|ing)?|brais(?:e|es|ed|ing)|sear(?:s|ed|ing)?|toast(?:s|ed|ing)?|tadka|wilt(?:s|ed|ing)?|blanch(?:es|ed|ing)?|parboil(?:s|ed|ing)?|char(?:s|red|ring)?|skillet)\b|\bdry[-\s]roast|\bstir[-\s]fry|\btawa\b|\bkadai\b|\bgriddle\b|\bflame\b/;
const PAN_IN_COOKING_POSITION = /\b(?:in|on) a (?:dry |hot |large |heavy |non-stick |wide |ovenproof )?pan\b/;
const NAMED_HEAT = /\b(?:over|on) (?:the )?(?:lowest |low |medium-high |medium |high |gentle )?heat\b/;
const SOFTEN_IN = /\bsoften\b[^.]{0,40}\bin\b/;
const ROAST_VERB = /\broast(?:s|ing)?\b/;
const GRILL_VERB = /\bgrill(?:s|ed|ing)?\b/;
const GENERIC_HEAT = /\bcook(?:s|ed|ing)?\b|\bheat(?:s|ed|ing)?\b|\bwarm(?:ed|ing|s)?\b|\bmelt(?:s|ed|ing)?\b/;

/**
 * The tags a dish's method earns. Pure and deterministic: the same
 * method text always derives the same tags, which is what makes the
 * pinned data checkable rather than a matter of taste.
 */
export function deriveDishTags(dish: Pick<Dish, "method">): DerivedDishTags {
  const steps = dish.method.map((s) => s.toLowerCase());
  const text = steps.join(" ");
  const bakeText = text.replace(BAKE_NOUN, " ");
  const mixerText = text.replace(MANUAL_ALTERNATIVE, " ");
  const equipment = new Set<EquipmentItem>();

  const underGrill = UNDER_GRILL.test(text) && !FLAME_ALT.test(text);
  const ovenCue =
    OVEN_WORD.test(text) || BAKE.test(bakeText) || underGrill || BROIL.test(text) || HOT_TEMP.test(text);
  if (ovenCue) equipment.add("oven");

  const pressureCue = PRESSURE.test(text);
  if (pressureCue) {
    equipment.add("pressure_cooker");
    equipment.add("stove");
  }

  const microwaveCue = MICROWAVE.test(text);
  if (microwaveCue) equipment.add("microwave");

  const pureeCue = steps.some((s) => PUREE.test(s) && !PUREE_NEGATED.test(s));
  if (MIXER.test(mixerText) || pureeCue) equipment.add("mixer_grinder");

  if (steps.some((s) => FRIDGE.test(s) && !STORAGE_ADVICE.test(s))) equipment.add("fridge");

  /* Grilling is the stove's when the step does not name the
     under-grill (broiler) route — a grill pan or griddle on the hob
     is the corpus's dominant usage. A step that offers a flame
     alongside the grill is the flame's either way. */
  const grillIsStove = steps.some(
    (s) => GRILL_VERB.test(s) && !(UNDER_GRILL.test(s) && !FLAME_ALT.test(s)),
  );
  const stoveCue =
    STOVE_VERBS.test(text) ||
    PAN_IN_COOKING_POSITION.test(text) ||
    NAMED_HEAT.test(text) ||
    SOFTEN_IN.test(text) ||
    grillIsStove ||
    (ROAST_VERB.test(text) && !ovenCue);
  if (stoveCue) equipment.add("stove");

  const cooking = stoveCue || ovenCue || pressureCue || microwaveCue || GENERIC_HEAT.test(text);
  if (
    cooking &&
    !equipment.has("stove") &&
    !equipment.has("oven") &&
    !equipment.has("pressure_cooker") &&
    !equipment.has("microwave")
  ) {
    /* Cooked, but the method names no recognisable equipment: the
       conservative default, made explicit (see the header). */
    equipment.add("stove");
  }

  return {
    equipment: DISH_EQUIPMENT_ORDER.filter((item) => equipment.has(item)),
    noCook: !cooking,
  };
}
