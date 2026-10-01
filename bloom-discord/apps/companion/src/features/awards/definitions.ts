import type { AwardKind, ParticipationSummary } from '@bloom/database';
import type { JsonObject } from '@bloom/shared-types';

/**
 * Milestones and achievements.
 *
 * The brief's chain is: meaningful action → Bloom Points → milestone → rank →
 * achievement. Points and rank landed in Phase 5; this is the recognition layer.
 *
 * ## The rule every definition obeys
 *
 * **It must be derived from real records.** Every condition below is a function
 * of counts that come from `check_ins` and `point_events` and can be
 * re-derived at any time. Nothing is granted because someone was around early,
 * because a job happened to run, or because a number was true once and cannot
 * be checked again. That is the difference between a milestone and a fake stat,
 * and the brief rules out the second.
 *
 * ## Milestones vs achievements
 *
 * A **milestone** is a threshold on a count that only moves forwards: total
 * check-ins, total wins. Every milestone is reachable by anyone, at any pace,
 * by continuing. Nobody can be locked out of one.
 *
 * An **achievement** recognises a *shape* of participation rather than a total.
 * It says something about how someone took part, not how much.
 *
 * ## No perfection awards, and why this differs from the Bloom app
 *
 * The app has streak achievements — "Seven Days Strong", "Thirty Strong" — and
 * they are right there, because a personal habit tracker is a tool someone
 * chose, and a run is a legitimate part of how it works.
 *
 * There are none here, deliberately. Two differences make Discord the wrong
 * place for them. These awards are *socially visible*, so a perfection badge
 * becomes a comparison between members rather than a note to oneself. And Phase
 * 5 established that a streak pays nothing precisely so that missing a day
 * costs nothing — granting a permanent badge for an unbroken run would hand
 * that cost straight back, and a wellbeing community should not charge somebody
 * for a difficult fortnight.
 *
 * So the closest thing to a streak award here is `returned`, which recognises
 * coming back after a long gap. That is the inversion on purpose: the thing the
 * platform notices is not that someone never stopped, but that they started
 * again.
 *
 * ## No award grants points
 *
 * Recognition is not currency. A milestone derived from a count of paid actions
 * that itself paid points would be a feedback loop, and inflation is what a
 * feedback loop in a points economy is called.
 *
 * The *mechanism* for paying an award now exists — `points` on a definition,
 * paid through `RewardsService` with the usual idempotency — because it was
 * asked for and because building it is how the decision stays reversible. It
 * is switched off at the only place that matters: **no definition in this
 * file sets `points`.** A test asserts that, so turning it on is an explicit
 * edit to a list of definitions and a deleted assertion, rather than
 * something that drifts in.
 *
 * ## Which sources a definition may read
 *
 * Only records Companion itself owns: check-ins and point events (via
 * `ParticipationSummary`) and paid referrals (via `referral_triggers`, which
 * Companion already consumes). Anything held by Guardian or Labs is out of
 * reach by design, and the awards that would need it are listed in
 * `RESERVED_DEFINITIONS` rather than approximated.
 */

/**
 * Which records a definition's criteria read.
 *
 * Declared rather than inferred so the service can load exactly the data the
 * pending definitions need. A member who holds every referral award should
 * not cost a referral query on every check-in.
 */
export type AwardSource = 'participation' | 'referrals';

/**
 * What kind of behaviour a definition recognises. Display and grouping only —
 * nothing branches on it.
 */
export type AwardCategory = 'participation' | 'community';

/**
 * How far along the ladder a definition sits.
 *
 * Static, derived from the definition rather than stored: the tier of an award
 * is a property of the award, not of the grant, so a retune changes every
 * member's view at once and no backfill is needed. Deliberately three values
 * and not a rarity percentage — a computed rarity would make holding an award
 * depend on how many other people hold it, which is a leaderboard wearing a
 * different hat.
 */
export type AwardTier = 'common' | 'uncommon' | 'rare';

/**
 * Everything a criterion may read.
 *
 * `qualifiedReferrals` is `null` when the service did not load it, which
 * happens whenever no pending definition declares the `referrals` source. A
 * criterion that reads it must handle null by returning false rather than
 * treating absent data as zero: "we did not look" and "there are none" are
 * different, and only one of them should ever deny an award silently.
 */
export interface AwardContext {
  readonly participation: ParticipationSummary;
  readonly qualifiedReferrals: number | null;
}

/** A countable position against a threshold. Display only. */
export interface AwardMeasure {
  readonly current: number;
  readonly target: number;
}

export interface AwardDefinition {
  /** Stable. Stored in `member_awards.award_key`; renaming one re-grants it. */
  readonly key: string;
  readonly kind: AwardKind;
  readonly name: string;
  readonly category: AwardCategory;
  readonly tier: AwardTier;
  /** Which records `earned` reads. The service loads only what is needed. */
  readonly source: AwardSource;
  /** What has to be true. Shown to members in the "not yet" list. */
  readonly condition: string;
  /** One quiet line, shown when it is earned. */
  readonly earnedLine: string;

  /**
   * Points paid on unlock, through `RewardsService`.
   *
   * Optional, and **set by nothing in V1** — see the "No award grants points"
   * note above, which still stands. The field and the whole payment path
   * exist, are exercised by tests with an injected definition, and are one
   * number away from being live. That is deliberate: building the mechanism
   * without turning it on keeps the decision reversible without a refactor,
   * and keeps it a decision rather than an absence.
   */
  readonly points?: number;

  /**
   * Whether a member can earn this more than once.
   *
   * Typed as the literal `false` rather than `boolean`, because
   * `member_awards` is keyed `(guild_id, user_id, award_key)` and a second
   * grant is refused by the primary key. Until that changes, `true` is not a
   * configuration this system can honour, so the type refuses it instead of
   * the value being quietly ignored.
   */
  readonly repeatable?: false;

  /** True when the context satisfies the condition. Pure. */
  earned(context: AwardContext): boolean;

  /**
   * How far along a member is, when that is a number at all.
   *
   * Optional because not every criterion has one. "Came back after a month
   * away" is not 40% complete after twelve days — it is a thing that has
   * either happened or not, and rendering a progress bar for it would invent
   * a quantity. Those definitions omit this, and the UI shows the condition
   * instead of a fraction.
   *
   * Returns null when the underlying source was not loaded.
   */
  measure?(context: AwardContext): AwardMeasure | null;
  /** The counts this grant rests on, stored so it can be re-derived. */
  evidence(context: AwardContext): JsonObject;
}

/**
 * An award that is defined but cannot yet be earned.
 *
 * Reserved definitions have **no `earned` function at all**, so there is no
 * code path that could grant one — the shape of the type is the guarantee,
 * not a flag someone has to remember to check. They exist so the key is
 * claimed and the intent is recorded, and so that nobody implements a
 * plausible-looking version against data the platform does not have.
 */
export interface ReservedAwardDefinition {
  readonly key: string;
  readonly kind: AwardKind;
  readonly name: string;
  readonly category: AwardCategory;
  /** Why it cannot be evaluated yet, in operator terms. */
  readonly blockedBy: string;
}

function checkInMilestone(
  count: number,
  name: string,
  earnedLine: string,
  tier: AwardTier,
): AwardDefinition {
  return {
    key: `milestone.checkins.${String(count)}`,
    kind: 'milestone',
    name,
    category: 'participation',
    tier,
    source: 'participation',
    condition: `Check in on ${String(count)} days.`,
    earnedLine,
    earned: (context) => context.participation.checkIns >= count,
    evidence: (context) => ({
      checkIns: context.participation.checkIns,
      threshold: count,
    }),
    measure: (context) => ({ current: context.participation.checkIns, target: count }),
  };
}

function winMilestone(
  count: number,
  name: string,
  earnedLine: string,
  tier: AwardTier,
): AwardDefinition {
  return {
    key: `milestone.wins.${String(count)}`,
    kind: 'milestone',
    name,
    category: 'participation',
    tier,
    source: 'participation',
    condition: `Share ${String(count)} small wins.`,
    earnedLine,
    earned: (context) => context.participation.wins >= count,
    evidence: (context) => ({ wins: context.participation.wins, threshold: count }),
    measure: (context) => ({ current: context.participation.wins, target: count }),
  };
}

/**
 * Introductions that stuck.
 *
 * Counts **paid** referrals only — a referral that qualified and was actually
 * rewarded. Pending and rejected ones do not count, so this cannot be farmed
 * by inviting accounts that leave again, and it cannot be earned before the
 * referral system has finished deciding.
 *
 * Reads a count Companion already owns: `referral_triggers` is the handoff
 * table Companion consumes to pay referrals, so this needs no new capability
 * and no Guardian data.
 */
function referralAchievement(
  count: number,
  name: string,
  condition: string,
  earnedLine: string,
  tier: AwardTier,
): AwardDefinition {
  return {
    key: `achievement.referrals.${String(count)}`,
    kind: 'achievement',
    name,
    category: 'community',
    tier,
    source: 'referrals',
    condition,
    earnedLine,
    // Null means the referral count was not loaded. Not zero: an award must
    // never be denied *or* granted on data nobody looked at.
    earned: (context) =>
      context.qualifiedReferrals !== null && context.qualifiedReferrals >= count,
    evidence: (context) => ({
      qualifiedReferrals: context.qualifiedReferrals ?? 0,
      threshold: count,
    }),
    measure: (context) =>
      context.qualifiedReferrals === null
        ? null
        : { current: context.qualifiedReferrals, target: count },
  };
}

/**
 * The thresholds widen, for the same reason the rank ladder does: even spacing
 * rewards volume, widening spacing rewards staying. They are also deliberately
 * sparse — eleven awards, not fifty. A wall of badges is a collection game, and
 * the brief asks for the opposite of one.
 */
export const AWARD_DEFINITIONS: readonly AwardDefinition[] = [
  checkInMilestone(
    1,
    'First Check-in',
    'Everything begins quietly. You began.',
    'common',
  ),
  checkInMilestone(10, 'Ten Days', 'Ten days of showing up.', 'common'),
  checkInMilestone(
    30,
    'Thirty Days',
    'Thirty days of arriving, at your own pace.',
    'uncommon',
  ),
  checkInMilestone(
    50,
    'Fifty Days',
    'Fifty days, at whatever pace suited you.',
    'uncommon',
  ),
  checkInMilestone(
    100,
    'One Hundred Days',
    'A hundred days. That is a long way.',
    'rare',
  ),
  checkInMilestone(
    250,
    'Two Hundred and Fifty Days',
    'Still here, and still arriving.',
    'rare',
  ),

  winMilestone(1, 'First Win', 'The first one shared is the hardest.', 'common'),
  winMilestone(10, 'Ten Wins', 'Ten things that went well, said out loud.', 'uncommon'),
  winMilestone(50, 'Fifty Wins', 'Fifty good days noticed and kept.', 'rare'),

  referralAchievement(
    1,
    'First Introduction',
    'Invite someone who stays and settles in.',
    'Someone is here because of you, and they stayed.',
    'uncommon',
  ),
  referralAchievement(
    5,
    'Five Introductions',
    'Invite five people who stay and settle in.',
    'Five people found this place through you.',
    'rare',
  ),

  {
    key: 'achievement.returned',
    kind: 'achievement',
    name: 'Came Back',
    category: 'participation',
    tier: 'uncommon',
    source: 'participation',
    condition: 'Return and check in after a month or more away.',
    /*
     * The one award this platform most wants to give. Leaving and coming back
     * is the normal shape of a long relationship with any habit, and it is the
     * moment people most expect to be told off.
     */
    earnedLine: 'You came back. That counts for more than never leaving.',
    earned: (context) => context.participation.longestGapDays >= 30,
    evidence: (context) => ({ longestGapDays: context.participation.longestGapDays }),
  },
  {
    key: 'achievement.both_in_a_day',
    kind: 'achievement',
    name: 'Arrived and Shared',
    category: 'participation',
    tier: 'uncommon',
    source: 'participation',
    condition: 'Check in and share a win on the same day, ten times.',
    earnedLine: 'Ten days of both arriving and saying what went well.',
    earned: (context) => context.participation.daysWithBoth >= 10,
    evidence: (context) => ({ daysWithBoth: context.participation.daysWithBoth }),
    measure: (context) => ({ current: context.participation.daysWithBoth, target: 10 }),
  },
  {
    key: 'achievement.six_months',
    kind: 'achievement',
    name: 'Six Seasons',
    category: 'participation',
    tier: 'rare',
    source: 'participation',
    condition: 'Check in during six different calendar months.',
    /*
     * Months rather than consecutive months. Six separate months over two years
     * earns this exactly as much as six in a row, which is the point: it
     * recognises a long relationship without requiring an unbroken one.
     */
    earnedLine: 'Six months with a day in each. Seasons change; you kept coming back.',
    earned: (context) => context.participation.months >= 6,
    evidence: (context) => ({ months: context.participation.months }),
    measure: (context) => ({ current: context.participation.months, target: 6 }),
  },
];

/**
 * Defined, named, and deliberately not earnable.
 *
 * Each of these needs records Bloom does not have, or does not have *here*.
 * Writing a plausible-looking criterion against data this bot cannot read is
 * how a recognition system starts lying, so they carry no `earned` function
 * and the evaluator cannot reach them.
 *
 * The keys are claimed now so that the day the data exists, the award appears
 * with the name it was always going to have, rather than a second key
 * alongside a quietly abandoned first one.
 */
export const RESERVED_DEFINITIONS: readonly ReservedAwardDefinition[] = [
  {
    key: 'achievement.feedback.1',
    kind: 'achievement',
    name: 'First Word',
    category: 'community',
    blockedBy:
      'Feedback lives in the labs repository, which Companion deliberately cannot read. Earning this needs a Labs→Companion contribution handoff of the kind referrals use, not a widened capability.',
  },
  {
    key: 'achievement.bugs.1',
    kind: 'achievement',
    name: 'First Report',
    category: 'community',
    blockedBy:
      'Bug reports live in the labs repository, same boundary as feedback. The same handoff would carry both.',
  },
  {
    key: 'achievement.events.1',
    kind: 'achievement',
    name: 'First Gathering',
    category: 'community',
    blockedBy:
      'There is no event system yet. `event_completion` exists as a point-event kind and nothing emits it, so there is no record of attendance to derive this from.',
  },
];

export const MILESTONES = AWARD_DEFINITIONS.filter((award) => award.kind === 'milestone');
export const ACHIEVEMENTS = AWARD_DEFINITIONS.filter(
  (award) => award.kind === 'achievement',
);

export function awardByKey(key: string): AwardDefinition | undefined {
  return AWARD_DEFINITIONS.find((award) => award.key === key);
}
