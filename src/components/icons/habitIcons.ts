/**
 * Habit icons — the catalogue, the twin-map, and the resolution rule
 * (UI update U4, plan §3.3/§3.4).
 *
 * Habits used to be emoji at the database level: `habits.icon_type`
 * defaulted to 'emoji' and the picker was a hardcoded emoji array. The
 * migration touches no existing row:
 *
 *   · new habits store `icon_type='bloom'` with `icon_value` = a glyph
 *     id from the registry (`sprout`, `fern`, …);
 *   · an existing 'emoji' row whose character is one of the 28 catalogue
 *     emoji renders as its bespoke twin glyph — the person's habit looks
 *     upgraded, their data is untouched, and reverting this renderer
 *     restores the old look exactly;
 *   · any other emoji (free-pasted, or a synonym with no true bespoke
 *     counterpart) renders as the emoji itself, exactly as it used to.
 *
 * `k` search keywords are the picker's original strings, unchanged, so
 * searching the picker behaves identically to before the swap.
 */

import { isBloomIconName, type BloomIconName } from "./BloomIcon";

export interface HabitIconChoice {
  /** Registry glyph id — what gets stored in `icon_value` for bloom habits. */
  id: BloomIconName;
  /** Search keywords for the picker (the original emoji catalogue's strings). */
  k: string;
  /** The legacy catalogue emoji this glyph is the bespoke twin of. */
  legacy: string;
}

/** The 28 picker choices, in the original catalogue's order. */
export const HABIT_ICON_CATALOGUE: readonly HabitIconChoice[] = [
  { id: "star-bloom", k: "star favourite", legacy: "⭐" },
  { id: "sprout", k: "grow plant seed", legacy: "🌱" },
  { id: "book", k: "read book study", legacy: "📚" },
  { id: "droplet", k: "water drink hydrate", legacy: "💧" },
  { id: "lotus", k: "meditate calm yoga", legacy: "🧘" },
  { id: "runner", k: "run exercise cardio", legacy: "🏃" },
  { id: "pen", k: "write journal note", legacy: "✍️" },
  { id: "apple", k: "eat food fruit", legacy: "🍎" },
  { id: "moon-bed", k: "sleep rest bed", legacy: "😴" },
  { id: "target-bloom", k: "goal focus target", legacy: "🎯" },
  { id: "palette-petal", k: "art draw create", legacy: "🎨" },
  { id: "strength", k: "gym strength workout", legacy: "💪" },
  { id: "broom", k: "clean tidy chore", legacy: "🧹" },
  { id: "capsule", k: "medicine pill health", legacy: "💊" },
  { id: "walker", k: "walk steps outside", legacy: "🚶" },
  { id: "sunrise", k: "morning sun wake", legacy: "☀️" },
  { id: "moon", k: "night evening moon", legacy: "🌙" },
  { id: "purse", k: "save money budget", legacy: "💰" },
  { id: "phone-off", k: "no phone screen detox", legacy: "📵" },
  { id: "mind", k: "learn brain think", legacy: "🧠" },
  { id: "headphones", k: "music listen podcast", legacy: "🎧" },
  { id: "skincare", k: "skincare routine", legacy: "🧴" },
  { id: "tooth", k: "teeth brush dental", legacy: "🦷" },
  { id: "call-bloom", k: "call family friend", legacy: "📞" },
  { id: "fern", k: "nature outdoors green", legacy: "🌿" },
  { id: "teacup", k: "tea drink calm", legacy: "🍵" },
  { id: "bicycle", k: "bike cycle ride", legacy: "🚴" },
  { id: "basket", k: "laundry chore home", legacy: "🧺" },
];

/**
 * Emoji → bespoke twin. All 28 catalogue emoji, plus the handful of
 * synonyms the previous Lucide map (habitGlyphs.tsx) already recognised
 * that have a true counterpart here: the other book/notebook emoji, a
 * potable-water tap, a fallen leaf, and the streak flame — which §3.2
 * explicitly replaces with a rising bud. Everything else renders as
 * itself, as free-pasted emoji always have.
 */
export const EMOJI_TWIN_MAP: Readonly<Record<string, BloomIconName>> = {
  ...Object.fromEntries(HABIT_ICON_CATALOGUE.map((c) => [c.legacy, c.id])),
  "📖": "book",
  "📕": "book",
  "📝": "pen",
  "📓": "pen",
  "🚰": "droplet",
  "🍃": "fern",
  "🔥": "streak-bud",
};

/** The bespoke twin for a stored emoji, or null when it renders as itself. */
export function twinGlyphFor(emoji: string): BloomIconName | null {
  return EMOJI_TWIN_MAP[emoji] ?? null;
}

export type HabitIconResolution =
  { kind: "glyph"; name: BloomIconName } | { kind: "emoji"; value: string } | { kind: "missing" };

/** The "custom picture" placeholder and friends can never be a picture. */
const MISSING_VALUES = new Set(["", "🖼️", "🖼"]);

/**
 * How a habit's stored icon should render (plan §3.4, step 2). Uploaded
 * images are handled by the caller before this is consulted — they pass
 * `iconType` 'image' only when there is no usable URL, which lands here
 * as missing and falls back to the monogram, as before.
 *
 *   bloom → the registry glyph (an unknown id degrades to star-bloom,
 *           never to raw text on the tile)
 *   emoji → its bespoke twin when it has one, else the emoji itself
 *   word-like values from old imports ("droplet") → missing, so the
 *           monogram steps in instead of raw text reading as a bug
 */
export function resolveHabitIcon(
  iconType: string | null | undefined,
  iconValue: string | null | undefined,
): HabitIconResolution {
  const value = iconValue ?? "";
  if (iconType === "bloom") {
    return { kind: "glyph", name: isBloomIconName(value) ? value : "star-bloom" };
  }
  if (MISSING_VALUES.has(value)) return { kind: "missing" };
  const twin = twinGlyphFor(value);
  if (twin) return { kind: "glyph", name: twin };
  if (/^[a-z0-9 _-]+$/i.test(value)) return { kind: "missing" };
  return { kind: "emoji", value };
}
