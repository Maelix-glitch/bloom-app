/**
 * Voice commands — a deterministic transcript → intent parser for
 * Voice-First India (System 11).
 *
 * The user speaks (Indian English / Hindi-flavoured English, recognised
 * on-device by the Web Speech API — see capability.ts); this module turns
 * the transcript into ONE intent the app can act on. No AI, no network,
 * no guessing:
 *
 *   · an unclear transcript parses to { kind: "unknown" } — never a
 *     best-guess action;
 *   · habit and food names are carried as HEARD and resolved by the
 *     caller against the real stored items (matchByName below) — an
 *     unmatched or ambiguous name is a no-action, never a substitute;
 *   · amounts are never invented — water with no amount heard carries
 *     no amount, and the executor refuses rather than logging a made-up
 *     number; a food count heard is that many servings, and no count
 *     heard means the intent carries no count (the confirm chip states
 *     the one-serving default out loud before anything is logged).
 *
 * Intents are data only. Parsing NEVER executes anything — the UI shows
 * a confirm chip and only an explicit confirm runs the action.
 */

import type { Meal } from "@/lib/nutrition/types";

/* --------------------------------- types --------------------------------- */

export type NavTarget =
  | "today"
  | "nutrition"
  | "trackers"
  | "coach"
  | "mood"
  | "cycle"
  | "rewards"
  | "profile"
  | "report";

export type VoiceIntent =
  /** "mark gym done" — heardName resolves against the real habits. */
  | { kind: "tick-habit"; heardName: string }
  /** "drank 500 ml water" / "two glasses of water". Exactly what was
      heard: ml and/or glasses; neither present = no amount was said. */
  | { kind: "log-water"; ml?: number; glasses?: number }
  /** "my weight is 82" — kg, already range-checked (25–350). */
  | { kind: "log-weight"; kg: number }
  /** "log two eggs" / "had an omelette for breakfast". */
  | { kind: "log-food"; heardName: string; count?: number; meal?: Meal }
  /** "open nutrition". */
  | { kind: "navigate"; target: NavTarget }
  /** Anything else — including empty transcripts. */
  | { kind: "unknown"; transcript: string };

export interface ParsedVoiceCommand {
  intent: VoiceIntent;
  /** The normalised transcript the intent was parsed from. */
  text: string;
}

/**
 * One glass of water, in ml — the app's own glass: the tracker entry
 * stepper moves water in 250 ml steps, "a glass of water"
 * (components/tk/MetricsEntryModal, STEPS.water). Pinned by test so a
 * future change to the stepper is a deliberate decision here too.
 */
export const GLASS_ML = 250;

/* ------------------------------ normalising ------------------------------ */

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

/** Lowercase, strip punctuation, collapse spaces. "Paani" stays "paani".
    A decimal point between digits survives ("82.5" is one number). */
export function normaliseTranscript(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/(\d)\.(\d)/g, "$1\u0001$2")
    .replace(/[.,!?;:"“”‘’]/g, " ")
    .replace(/\u0001/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a number at the start of `tokens`: digits ("500", "82.5"),
 * single words ("two", "eighty"), compounds ("eighty two",
 * "eighty two point five") and "a"/"an" (= 1, only when allowArticle).
 * Returns the value and how many tokens it consumed, or null.
 */
function parseNumber(
  tokens: readonly string[],
  opts: { allowArticle?: boolean } = {},
): { value: number; used: number } | null {
  if (tokens.length === 0) return null;
  const first = tokens[0]!;
  if (/^\d+(?:\.\d+)?$/.test(first)) {
    return { value: Number(first), used: 1 };
  }
  if (opts.allowArticle && (first === "a" || first === "an")) {
    return { value: 1, used: 1 };
  }
  let value = 0;
  let used = 0;
  let seen = false;
  while (used < tokens.length) {
    const w = tokens[used]!;
    if (w === "point" && seen && used + 1 < tokens.length) {
      const frac = tokens[used + 1]!;
      if (/^\d$/.test(frac)) {
        value += Number(frac) / 10;
        used += 2;
      } else if (frac in NUMBER_WORDS && NUMBER_WORDS[frac]! < 10) {
        value += NUMBER_WORDS[frac]! / 10;
        used += 2;
      }
      break;
    }
    const n = NUMBER_WORDS[w];
    if (n === undefined) break;
    if (n === 100) {
      value = (seen ? value : 1) * 100;
    } else {
      value += n;
    }
    seen = true;
    used += 1;
  }
  return seen ? { value, used } : null;
}

/** Parse a number anywhere among the tokens (first parseable run). */
function findNumber(
  tokens: readonly string[],
  opts: { allowArticle?: boolean } = {},
): { value: number; index: number; used: number } | null {
  for (let i = 0; i < tokens.length; i++) {
    const parsed = parseNumber(tokens.slice(i), opts);
    if (parsed) return { ...parsed, index: i };
  }
  return null;
}

/* ------------------------------- navigation ------------------------------ */

const NAV_WORDS: Record<string, NavTarget> = {
  today: "today",
  home: "today",
  nutrition: "nutrition",
  food: "nutrition",
  trackers: "trackers",
  tracker: "trackers",
  coach: "coach",
  mood: "mood",
  cycle: "cycle",
  rewards: "rewards",
  reward: "rewards",
  profile: "profile",
  report: "report",
};

function parseNavigate(text: string): VoiceIntent | null {
  const m = /^(?:open|go to|show(?: me)?|take me to|navigate to)\s+(?:the\s+)?([a-z]+)(?:\s+page)?$/.exec(
    text,
  );
  if (!m) return null;
  const target = NAV_WORDS[m[1]!];
  return target ? { kind: "navigate", target } : null;
}

export const NAV_LABELS: Record<NavTarget, string> = {
  today: "Today",
  nutrition: "Nutrition",
  trackers: "Trackers",
  coach: "Coach",
  mood: "Mood",
  cycle: "Cycle",
  rewards: "Rewards",
  profile: "Profile",
  report: "Report",
};

export const NAV_PATHS: Record<NavTarget, string> = {
  today: "/",
  nutrition: "/nutrition",
  trackers: "/trackers",
  coach: "/coach",
  mood: "/mood",
  cycle: "/cycle",
  rewards: "/rewards",
  profile: "/profile",
  report: "/report",
};

/* --------------------------------- weight -------------------------------- */

function parseWeight(text: string, tokens: readonly string[]): VoiceIntent | null {
  if (!/(weight|weigh)/.test(text)) return null;
  const found = findNumber(tokens);
  if (!found) return null;
  const kg = found.value;
  // The same range the weigh-in store itself accepts (useBodyProfile).
  if (kg < 25 || kg > 350) return null;
  return { kind: "log-weight", kg };
}

/* --------------------------------- water --------------------------------- */

const WATER_NOUNS = ["water", "paani", "pani"];

function parseWater(text: string, tokens: readonly string[]): VoiceIntent | null {
  const nounIndex = tokens.findIndex((t) => WATER_NOUNS.includes(t));
  if (nounIndex === -1) return null;
  // A verb of drinking/logging, the noun alone with an amount, or the
  // amount right before the noun ("500 ml water") all count; a bare
  // mention ("water") still parses — with NO amount, honestly.
  let ml: number | undefined;
  let glasses: number | undefined;
  for (let i = 0; i < tokens.length; i++) {
    const parsed = parseNumber(tokens.slice(i), { allowArticle: true });
    if (!parsed) continue;
    const unit = tokens[i + parsed.used];
    if (unit === "ml" || unit === "millilitre" || unit === "millilitres" || unit === "milliliter" || unit === "milliliters") {
      ml = parsed.value;
      break;
    }
    if (unit === "litre" || unit === "litres" || unit === "liter" || unit === "liters" || unit === "l") {
      ml = parsed.value * 1000;
      break;
    }
    if (unit === "glass" || unit === "glasses") {
      glasses = parsed.value;
      break;
    }
  }
  const intent: VoiceIntent =
    ml !== undefined
      ? { kind: "log-water", ml }
      : glasses !== undefined
        ? { kind: "log-water", glasses }
        : { kind: "log-water" };
  void text;
  return intent;
}

/** Resolve a water intent to ml — glasses convert at the app's glass
    size; no amount heard resolves to null (never invented). */
export function waterMlOf(intent: Extract<VoiceIntent, { kind: "log-water" }>): number | null {
  if (intent.ml !== undefined) return intent.ml;
  if (intent.glasses !== undefined) return intent.glasses * GLASS_ML;
  return null;
}

/* --------------------------------- habits -------------------------------- */

function cleanName(raw: string): string {
  return raw
    .replace(/\b(done|today|please|now)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseHabit(text: string): VoiceIntent | null {
  const patterns: RegExp[] = [
    /^(?:mark|tick|check|complete)\s+(.+?)(?:\s+as\s+done)?$/,
    /^(.+?)\s+done$/,
    /^(?:i\s+)?(?:did|finished|completed)\s+(.+)$/,
    /^done\s+(.+)$/,
  ];
  for (const pattern of patterns) {
    const m = pattern.exec(text);
    if (!m) continue;
    const name = cleanName(m[1]!);
    // "log …", "open …" etc. are other intents' shapes, not habit names.
    if (!name || /^(log|open|go|show|drank|drink|add)\b/.test(name)) continue;
    if (name === "weight" || WATER_NOUNS.includes(name)) continue;
    return { kind: "tick-habit", heardName: name };
  }
  return null;
}

/* ---------------------------------- food --------------------------------- */

const MEAL_WORDS: Record<string, Meal> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "snack",
  snacks: "snack",
};

function parseFood(text: string): VoiceIntent | null {
  const m =
    /^(?:log|add|record)\s+(.+)$/.exec(text) ??
    /^(?:i\s+)?(?:ate|had|eaten)\s+(.+)$/.exec(text);
  if (!m) return null;
  let rest = m[1]!;
  let meal: Meal | undefined;
  const mealMatch = /\bfor\s+(breakfast|lunch|dinner|snacks?)\s*$/.exec(rest);
  if (mealMatch) {
    meal = MEAL_WORDS[mealMatch[1]!];
    rest = rest.slice(0, mealMatch.index).trim();
  }
  const tokens = rest.split(" ").filter(Boolean);
  let count: number | undefined;
  const leading = parseNumber(tokens, { allowArticle: true });
  if (leading && tokens.length > leading.used) {
    count = leading.value;
    tokens.splice(0, leading.used);
  }
  const name = tokens.join(" ").trim();
  if (!name) return null;
  if (name === "weight" || WATER_NOUNS.includes(name)) return null;
  return {
    kind: "log-food",
    heardName: name,
    ...(count !== undefined ? { count } : {}),
    ...(meal ? { meal } : {}),
  };
}

/* ------------------------------ name matching ---------------------------- */

function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Singular-tolerant key: drops a trailing "s" on the last word
    ("eggs" → "egg") so plurals heard match singular stored names. */
function singularKey(name: string): string {
  const key = nameKey(name);
  return key.replace(/(\w+)s$/, "$1");
}

export type NameMatch<T> =
  | { status: "match"; item: T }
  | { status: "ambiguous"; candidates: T[] }
  | { status: "none" };

/**
 * Resolve a heard name against real stored items. Deterministic order:
 * exact normalised match → singular-tolerant exact match → unique
 * prefix/contains match. Anything else is "none" or "ambiguous" — the
 * caller must not substitute a different item.
 */
export function matchByName<T extends { name: string }>(
  items: readonly T[],
  heardName: string,
): NameMatch<T> {
  const heard = nameKey(heardName);
  if (!heard) return { status: "none" };
  const exact = items.filter((i) => nameKey(i.name) === heard);
  if (exact.length === 1) return { status: "match", item: exact[0]! };
  if (exact.length > 1) return { status: "ambiguous", candidates: exact };
  const heardSingular = singularKey(heardName);
  const singular = items.filter(
    (i) => singularKey(i.name) === heardSingular || nameKey(i.name) === heardSingular,
  );
  if (singular.length === 1) return { status: "match", item: singular[0]! };
  if (singular.length > 1) return { status: "ambiguous", candidates: singular };
  const partial = items.filter((i) => {
    const key = nameKey(i.name);
    return key.startsWith(heard) || key.includes(heard);
  });
  if (partial.length === 1) return { status: "match", item: partial[0]! };
  if (partial.length > 1) return { status: "ambiguous", candidates: partial };
  return { status: "none" };
}

/* --------------------------------- parser -------------------------------- */

export function parseVoiceCommand(raw: string): ParsedVoiceCommand {
  const text = normaliseTranscript(raw ?? "");
  if (!text) return { intent: { kind: "unknown", transcript: "" }, text };
  const tokens = text.split(" ").filter(Boolean);
  const intent =
    parseNavigate(text) ??
    parseWeight(text, tokens) ??
    parseWater(text, tokens) ??
    parseHabit(text) ??
    parseFood(text) ??
    ({ kind: "unknown", transcript: text } as const);
  return { intent, text };
}
