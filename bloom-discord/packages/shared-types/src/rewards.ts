/**
 * Bloom Rewards vocabulary.
 *
 *   Goal → meaningful action → Bloom Points → milestone → rank → achievement
 *
 * Types only; the ledger and the award pipeline land in Phase 4. Two rules are
 * encoded here rather than left to the implementation:
 *
 *   • Points are integers. Never floats — a rounding error in a ledger is a
 *     trust problem, not a display problem.
 *   • Rank is DERIVED from the point total, never stored as an independent
 *     column. A stored rank is a second source of truth that will drift.
 */
export const RANKS = [
  'seedling',
  'first_bloom',
  'sprout',
  'budding',
  'in_bloom',
  'flourish',
  'evergreen',
  'deep_roots',
  'master_bloom',
] as const;

export type Rank = (typeof RANKS)[number];

export const RANK_DISPLAY_NAMES: Readonly<Record<Rank, string>> = {
  seedling: 'Seedling',
  first_bloom: 'First Bloom',
  sprout: 'Sprout',
  budding: 'Budding',
  in_bloom: 'In Bloom',
  flourish: 'Flourish',
  evergreen: 'Evergreen',
  deep_roots: 'Deep Roots',
  master_bloom: 'Master Bloom',
};

/**
 * Point thresholds, ascending, inclusive.
 *
 * Provisional. These numbers must be reviewed against the Bloom app's existing
 * progression model before Phase 4 ships, so that a member's Discord rank and
 * their in-app rank do not tell two different stories. Treated as
 * configuration, not a constant, from Phase 4 onward.
 */
export const RANK_THRESHOLDS: readonly {
  readonly rank: Rank;
  readonly minPoints: number;
}[] = [
  { rank: 'seedling', minPoints: 0 },
  { rank: 'first_bloom', minPoints: 50 },
  { rank: 'sprout', minPoints: 150 },
  { rank: 'budding', minPoints: 350 },
  { rank: 'in_bloom', minPoints: 700 },
  { rank: 'flourish', minPoints: 1200 },
  { rank: 'evergreen', minPoints: 2000 },
  { rank: 'deep_roots', minPoints: 3200 },
  { rank: 'master_bloom', minPoints: 5000 },
];

/**
 * Derive rank from a point total.
 *
 * Negative totals should be impossible — the ledger constrains balances to be
 * non-negative — but this clamps rather than throwing, because a display helper
 * is the wrong place to discover a ledger bug.
 */
export function rankForPoints(points: number): Rank {
  let current: Rank = 'seedling';
  for (const tier of RANK_THRESHOLDS) {
    if (points >= tier.minPoints) current = tier.rank;
    else break;
  }
  return current;
}

/** Points still needed for the next rank, or `null` at the top. */
export function pointsToNextRank(
  points: number,
): { rank: Rank; remaining: number } | null {
  for (const tier of RANK_THRESHOLDS) {
    if (points < tier.minPoints) {
      return { rank: tier.rank, remaining: tier.minPoints - points };
    }
  }
  return null;
}

export function isRank(value: unknown): value is Rank {
  return typeof value === 'string' && (RANKS as readonly string[]).includes(value);
}
