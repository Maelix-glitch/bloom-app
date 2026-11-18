/**
 * Nutrition — dish regions for the cuisine preference (plan v8).
 *
 * The Assessment (and only the Assessment) asks whether the person
 * leans North Indian or South Indian. The plan composer honours the
 * answer as a ranking bonus — never a filter — which needs every dish
 * placed, honestly, as north, south, or neither.
 *
 * The library's own `cuisine` tag is too coarse for that: it knows
 * only "india", "kerala" and "international". So the region is
 * DERIVED here, from the signals the library actually carries:
 *
 *   · cuisine "kerala" → south. Kerala is a South Indian cuisine;
 *     the library's own tag says it outright.
 *   · cuisine "international" → neither. The preference is between
 *     two Indian regions; an international dish is outside both.
 *   · otherwise (the "india" bucket and untagged dishes) the dish's
 *     English name and id are matched against the curated marker
 *     tables below: the place and cuisine names of the two regions
 *     (Kerala, Malabar, Chettinad, Tamil, Andhra/Telugu, Hyderabadi,
 *     Karnataka… / Punjabi, Kashmiri, Awadhi, Mughlai, Delhi,
 *     Rajasthani…) plus a short list of dish forms that belong to one
 *     region's kitchen and no other's (sambar, dosa, thoran… /
 *     makhani, chole, kulcha, yakhni…).
 *
 * Honesty rules, held deliberately:
 *   · A dish matching BOTH regions' markers is neither — a name that
 *     argues both ways makes no claim. The same restraint keeps the
 *     pan-Indian words out of the tables entirely: biryani, kebab,
 *     pulao, chaat and korma are cooked from Kashmir to Kanyakumari,
 *     and "dhaba" appears in the library in a Bengali dish's name,
 *     so none of them can honestly mark one region.
 *   · A dish matching NEITHER is neither — most of the pan-Indian
 *     library, and all of the West/East/Central cuisines (Gujarati,
 *     Maharashtrian, Goan, Bengali…), which the preference does not
 *     ask about. "Neither" never excludes a dish; it only means the
 *     preference has nothing to say about it.
 *   · The tables are curated data, like the data layer's food
 *     classifications: extend them by adding a marker that is true
 *     of the region, never by guessing at a single dish.
 */

import type { Dish } from "./dishes";

/** The two regions the Assessment's cuisine preference names. The
 *  values match the preference's own answer values, so a preference
 *  and a region compare directly. */
export type DishRegion = "north_indian" | "south_indian";

/** South markers: the region's place/cuisine names, then its
 *  distinctive dish forms. Matched as substrings of the dish's
 *  lowercased English name and id. */
const SOUTH_MARKERS: readonly string[] = [
  /* places & cuisines — Kerala */
  "kerala",
  "malabar",
  "thalassery",
  "palakkad",
  "kozhikode",
  "malayali",
  /* places & cuisines — Tamil Nadu */
  "tamil",
  "chettinad",
  "karaikudi",
  "madurai",
  "thanjavur",
  "tanjore",
  "kongu",
  "nagercoil",
  /* places & cuisines — Andhra Pradesh & Telangana */
  "andhra",
  "telugu",
  "hyderabad",
  "nellore",
  "guntur",
  "rayalaseema",
  /* places & cuisines — Karnataka */
  "karnataka",
  "mangalore",
  "mangalorean",
  "udupi",
  "mysore",
  "mysuru",
  "coorg",
  "kodava",
  /* places — Pondicherry */
  "pondicherry",
  /* dish forms of the South's kitchens */
  "sambar",
  "rasam",
  "dosa",
  "idli",
  "uttapam",
  "uthappam",
  "appam",
  "idiappam",
  "puttu",
  "aviyal",
  "avial",
  "thoran",
  "theeyal",
  "pulissery",
  "erissery",
  "koottu",
  "kootu",
  "pachadi",
  "pongal",
  "bisi bele",
  "paniyaram",
  "pesarattu",
  "kuzhambu",
  "poriyal",
  "sadya",
  "pathiri",
  "payasam",
  "parotta",
  "puliyodharai",
  "sundal",
  "salan",
  "rotti",
  /* Malayalam dish words (Kerala dishes in the pan-Indian files may
     carry the "india" tag rather than "kerala") */
  "meen",
  "kozhi",
  "chemmeen",
];

/** North markers: the region's place/cuisine names, then its
 *  distinctive dish forms. */
const NORTH_MARKERS: readonly string[] = [
  /* places & cuisines — Punjab */
  "punjabi",
  "punjab",
  "amritsar",
  "patiala",
  /* places & cuisines — Kashmir */
  "kashmir",
  "wazwan",
  /* places & cuisines — Awadh & Uttar Pradesh */
  "awadhi",
  "lucknow",
  "banarasi",
  "allahabadi",
  /* places & cuisines — Mughlai & Delhi */
  "mughlai",
  "delhi",
  /* places & cuisines — Rajasthan */
  "rajasthan",
  "marwari",
  "jaipur",
  "jodhpur",
  /* places & cuisines — Himachal & the hills */
  "himachal",
  "dogri",
  "pahadi",
  /* dish forms of the North's kitchens */
  "makhani",
  "chole",
  "rajma",
  "kulcha",
  "tandoori",
  "yakhni",
  "rogan josh",
  "gushtaba",
  "sarson",
  "tehri",
  "nimona",
  "bedmi",
  "butter chicken",
  "butter masala",
  "tikka masala",
  "shahi",
  "bharta",
  "saag",
  "kadai",
  "palak paneer",
  "matar paneer",
  "paneer bhurji",
  "galouti",
  "sheermal",
  "langar",
  "lassi",
  "tikki",
  "makki",
  "missi roti",
  /* Rajasthan's named dishes */
  "baati",
  "gatte",
  "laal maas",
  "panchmel",
  "mangodi",
  /* Himachal's named dishes */
  "madra",
  "tudkiya",
  "aktori",
];

function matchesAny(haystack: string, markers: readonly string[]): boolean {
  return markers.some((marker) => haystack.includes(marker));
}

/**
 * The region a dish belongs to for the cuisine preference, or null
 * when the preference has nothing to say about it. Pure and total:
 * every dish gets an answer, and the answer is never a guess — the
 * rules in the header are the whole derivation.
 */
export function dishRegion(dish: Dish): DishRegion | null {
  if (dish.cuisine === "kerala") return "south_indian";
  if (dish.cuisine === "international") return null;
  const haystack = `${dish.name.en} ${dish.id}`.toLowerCase();
  const south = matchesAny(haystack, SOUTH_MARKERS);
  const north = matchesAny(haystack, NORTH_MARKERS);
  if (south && north) return null;
  if (south) return "south_indian";
  if (north) return "north_indian";
  return null;
}
