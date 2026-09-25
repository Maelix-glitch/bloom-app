/**
 * Bloom Rewards vocabulary.
 *
 *   Goal → meaningful action → Bloom Points → milestone → rank → achievement
 *
 * Three rules are encoded here rather than left to the implementation:
 *
 *   • Points are integers. Never floats — a rounding error in a ledger is a
 *     trust problem, not a display problem.
 *   • Rank is DERIVED from the point total, never stored as an independent
 *     column. A stored rank is a second source of truth that will drift.
 *   • Every award has a fixed value. There are no multipliers, no streak
 *     bonuses and no combos; see POINT_AWARDS.
 *
 * ## These are not the Bloom app's points
 *
 * Phase 0 left a note here: review these thresholds against the Bloom app's
 * progression model so a member's Discord rank and their in-app rank do not
 * tell two different stories. That review happened in Phase 5, and the finding
 * was that they cannot be reconciled, because they measure different things:
 *
 *   • The app's Bloom Points are earned from verified personal records — habit
 *     logs, tracker days, mood entries — where the cheapest goal pays 100 and
 *     the named ladder runs to 25,000 across twelve ranks (Seedling … Wildflower
 *     … Bloomkeeper), then continues forever in seasons.
 *   • These points are earned from showing up in a Discord server. A check-in
 *     pays 5.
 *
 * Mapping one onto the other would mean either inflating community chatter into
 * personal progress or deflating someone's real work to fit a chat ladder. So
 * the two are kept separate and named separately: the app has **Bloom Points**,
 * this has **Bloom Rewards points**, and nothing in Discord ever claims to
 * reflect app progress. There is also no account link between a Discord user
 * and a Bloom profile, so Discord could not read those totals even if it should.
 *
 * The nine ranks below are the ones the platform brief specifies for the
 * community ladder. They are intentionally a shorter, slower, smaller thing
 * than the app's journey.
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
 * Calibrated in Phase 5 against what this platform actually pays. A member who
 * checks in most days and shares the occasional win earns roughly 5–15 points a
 * day, which puts First Bloom within the first week, In Bloom around two
 * months, and Master Bloom beyond a year of genuine participation.
 *
 * The gaps widen deliberately. A ladder with even spacing rewards volume; one
 * that widens rewards staying, which is the behaviour worth encouraging in a
 * community about consistency. Nothing accelerates it: no multipliers, no
 * streak bonuses, no catch-up mechanics.
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

/* -----------------------------------------------------------------------------
 * What earns points
 * ---------------------------------------------------------------------------*/

/**
 * The kinds of ledger entry. Closed set, mirrored by a CHECK constraint in
 * migration 0006 — an open text column is how a future caller invents
 * `bonus_event` and nobody notices the economy changed.
 */
export const POINT_KINDS = [
  'check_in',
  'small_win',
  'manual_award',
  'adjustment',
] as const;

export type PointKind = (typeof POINT_KINDS)[number];

export function isPointKind(value: unknown): value is PointKind {
  return typeof value === 'string' && (POINT_KINDS as readonly string[]).includes(value);
}

/**
 * What each automatic action pays. Fixed, small, and boring on purpose.
 *
 * Both numbers are deliberately low relative to the ladder. The brief rules out
 * XP farming and reward inflation, and the way a points economy inflates is not
 * usually a decision — it is a series of individually reasonable increases. A
 * constant here that everything reads makes any such change one visible diff.
 */
export const POINT_AWARDS: Readonly<Record<'check_in' | 'small_win', number>> = {
  check_in: 5,
  small_win: 10,
};

/**
 * How many small wins can earn points in one calendar day.
 *
 * Sharing a twelfth win is fine and stays welcome; the twelfth one just does
 * not pay. The cap is on the reward, never on the participation, because a
 * community feature that tells someone to stop posting has failed at its job.
 */
export const DAILY_SMALL_WIN_LIMIT = 3;

/**
 * The largest single manual award or adjustment staff may make.
 *
 * Not a permission check — administrators are trusted — but a guard against the
 * mistyped zero. 5,000 points is the whole ladder; awarding it by accident is
 * not recoverable in any way a member would find satisfying.
 */
export const MANUAL_AWARD_LIMIT = 500;
