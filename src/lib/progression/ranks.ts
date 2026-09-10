/**
 * Bloom Progression — the rank ladder.
 *
 * Twelve named ranks carry a person to 25,000 Bloom Points. Past that the
 * ladder does not end: it enters its **cycle layer**, where each further
 * 6,000 points opens the next season of Bloom. There is deliberately no final
 * rank and no "everything unlocked" state — the journey simply continues, at
 * a gentle pace, for as long as someone keeps showing up.
 *
 * Thresholds are calibrated against what Bloom actually pays:
 *   · a habit tick is worth 5–500 points (default 10, set by the person);
 *   · verified goals and milestones pay 100–1,500 points on top.
 * A steady first week (a few habits a day plus the early milestones) lands
 * around 1,200–1,900 points, so the first ranks arrive as encouragement —
 * "First Bloom" within days, "In Bloom" within a few weeks of real use.
 */

import type { RankDef, RankState } from "./types";

/* ------------------------------- named ladder ----------------------------- */

interface NamedRank {
  id: string;
  name: string;
  threshold: number;
  tone: string;
  emblem: string;
  affirmation: string;
}

const NAMED: NamedRank[] = [
  {
    id: "seedling",
    name: "Seedling",
    threshold: 0,
    tone: "var(--sage)",
    emblem: "seed",
    affirmation: "Everything begins quietly. You began.",
  },
  {
    id: "first-bloom",
    name: "First Bloom",
    threshold: 500,
    tone: "var(--rose)",
    emblem: "first-bloom",
    affirmation: "You kept showing up. That is the whole secret.",
  },
  {
    id: "sprout",
    name: "Sprout",
    threshold: 1_200,
    tone: "var(--sage)",
    emblem: "sprout",
    affirmation: "Small days, stacked. Look what they grew into.",
  },
  {
    id: "budding",
    name: "Budding",
    threshold: 2_200,
    tone: "var(--amber)",
    emblem: "budding",
    affirmation: "Something is taking shape here.",
  },
  {
    id: "in-bloom",
    name: "In Bloom",
    threshold: 3_500,
    tone: "var(--gold)",
    emblem: "bloom",
    affirmation: "This is what consistency looks like when it opens.",
  },
  {
    id: "flourish",
    name: "Flourish",
    threshold: 5_000,
    tone: "var(--gold)",
    emblem: "flourish",
    affirmation: "You are not just keeping up. You are growing.",
  },
  {
    id: "wildflower",
    name: "Wildflower",
    threshold: 7_000,
    tone: "var(--violet)",
    emblem: "wildflower",
    affirmation: "Your own shape, your own pace, entirely yours.",
  },
  {
    id: "evergreen",
    name: "Evergreen",
    threshold: 9_500,
    tone: "var(--sage)",
    emblem: "evergreen",
    affirmation: "Seasons changed. You stayed.",
  },
  {
    id: "blossom-keeper",
    name: "Blossom Keeper",
    threshold: 12_500,
    tone: "var(--rose)",
    emblem: "keeper",
    affirmation: "You have built something worth tending.",
  },
  {
    id: "perennial",
    name: "Perennial",
    threshold: 16_000,
    tone: "var(--sky)",
    emblem: "perennial",
    affirmation: "This returns, year after year, because you do.",
  },
  {
    id: "everbloom",
    name: "Everbloom",
    threshold: 20_000,
    tone: "var(--violet)",
    emblem: "everbloom",
    affirmation: "Change became your habit, not your obstacle.",
  },
  {
    id: "bloomkeeper",
    name: "Bloomkeeper",
    threshold: 25_000,
    tone: "var(--gold)",
    emblem: "bloomkeeper",
    affirmation: "You tend the whole garden now.",
  },
];

/* ------------------------------ cycle layer ------------------------------- */

/** Every further rank past the named ladder costs this much. */
export const CYCLE_STEP = 6_000;

/** Seasons repeat in this order; a repeat earns a numeral ("Season of Light II"). */
const CYCLE_SEASONS = [
  "Season of Light",
  "Season of Roots",
  "Season of Mist",
  "Season of Gold",
  "Season of Blossom",
] as const;

const CYCLE_EMBLEMS = ["cycle-light", "cycle-roots", "cycle-mist", "cycle-gold", "cycle-blossom"] as const;

const ROMAN = ["", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;

/** The fixed floor of the ladder (a fresh account starts at tier 1). */
export const LADDER_BASE: RankDef[] = NAMED.map((rank, index) => ({
  tier: index + 1,
  id: rank.id,
  name: rank.name,
  threshold: rank.threshold,
  title: rank.name,
  tone: rank.tone,
  emblem: rank.emblem,
  affirmation: rank.affirmation,
  cycle: 1,
}));

const LAST_NAMED = LADDER_BASE[LADDER_BASE.length - 1] as RankDef;

/**
 * The cycle rank that begins `steps` seasons after the named ladder.
 * Deterministic and endless — `steps` may be any non-negative integer.
 */
export function cycleRankAt(steps: number): RankDef {
  const seasonIndex = steps % CYCLE_SEASONS.length;
  const round = Math.floor(steps / CYCLE_SEASONS.length);
  const base = CYCLE_SEASONS[seasonIndex] as string;
  const numeral = round === 0 ? "" : (ROMAN[round % ROMAN.length] ?? `+${round}`);
  const name = numeral ? `${base} ${numeral}` : base;
  return {
    tier: LADDER_BASE.length + 1 + steps,
    id: `cycle-${steps + 1}`,
    name,
    threshold: LAST_NAMED.threshold + CYCLE_STEP * (steps + 1),
    title: name,
    tone: steps % 2 === 0 ? "var(--gold)" : "var(--violet)",
    emblem: CYCLE_EMBLEMS[seasonIndex] ?? "cycle-light",
    affirmation: "The garden keeps going. So do you.",
    cycle: steps + 2,
  };
}

/** The named ladder plus `count` cycle ranks (used by the journey path). */
export function ladderPreview(count = 2): RankDef[] {
  const out: RankDef[] = [...LADDER_BASE];
  for (let i = 0; i < count; i += 1) out.push(cycleRankAt(i));
  return out;
}

/* ------------------------------- derivation ------------------------------- */

function rankAtOrBelow(points: number): RankDef {
  let found = LADDER_BASE[0] as RankDef;
  for (const rank of LADDER_BASE) {
    if (points >= rank.threshold) found = rank;
    else break;
  }
  if (points < LAST_NAMED.threshold + CYCLE_STEP) return found;
  const steps = Math.floor((points - LAST_NAMED.threshold) / CYCLE_STEP) - 1;
  return cycleRankAt(Math.max(0, steps));
}

function rankAfter(rank: RankDef): RankDef {
  if (rank.tier < LADDER_BASE.length) {
    const next = LADDER_BASE.find((r) => r.tier === rank.tier + 1);
    if (next) return next;
  }
  // Bloomkeeper (the last named rank) opens the first season; each season
  // opens the next one, forever.
  return cycleRankAt(Math.max(0, rank.tier - LADDER_BASE.length));
}

/**
 * Rank state for an earned-point total. Pure, monotonic, and total: any
 * non-negative number resolves, including numbers far past the named ladder.
 */
export function rankFor(points: number): RankState {
  const safe = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  const rank = rankAtOrBelow(safe);
  const next = rankAfter(rank);
  const span = Math.max(1, next.threshold - rank.threshold);
  const intoRank = Math.max(0, safe - rank.threshold);
  return {
    rank,
    next,
    intoRank,
    span,
    progress: Math.min(1, intoRank / span),
    remaining: Math.max(0, next.threshold - safe),
    beyondNamed: rank.threshold >= LAST_NAMED.threshold,
  };
}

/** Ranks around a person, for the journey path: a little past, a little ahead. */
export function journeyRanks(points: number, behind = 2, ahead = 3): RankDef[] {
  const current = rankAtOrBelow(Math.max(0, Math.floor(points)));
  const out: RankDef[] = [];
  for (let i = behind; i >= 1; i -= 1) {
    const tier = current.tier - i;
    if (tier < 1) continue;
    if (tier <= LADDER_BASE.length) {
      const rank = LADDER_BASE[tier - 1];
      if (rank) out.push(rank);
    } else {
      out.push(cycleRankAt(tier - LADDER_BASE.length - 1));
    }
  }
  out.push(current);
  for (let i = 1; i <= ahead; i += 1) {
    const tier = current.tier + i;
    if (tier <= LADDER_BASE.length) {
      const rank = LADDER_BASE[tier - 1];
      if (rank) out.push(rank);
    } else {
      out.push(cycleRankAt(tier - LADDER_BASE.length - 1));
    }
  }
  return out;
}

/** True when `a` is a later rank than `b`. */
export function rankIsAfter(a: RankDef, b: RankDef): boolean {
  return a.tier > b.tier;
}

/** Total named ranks — the ladder's "chapter one". */
export const NAMED_RANK_COUNT = LADDER_BASE.length;
