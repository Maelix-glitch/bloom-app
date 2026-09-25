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
 */

export interface AwardDefinition {
  /** Stable. Stored in `member_awards.award_key`; renaming one re-grants it. */
  readonly key: string;
  readonly kind: AwardKind;
  readonly name: string;
  /** What has to be true. Shown to members in the "not yet" list. */
  readonly condition: string;
  /** One quiet line, shown when it is earned. */
  readonly earnedLine: string;
  /** True when the summary satisfies the condition. Pure. */
  earned(summary: ParticipationSummary): boolean;
  /** The counts this grant rests on, stored so it can be re-derived. */
  evidence(summary: ParticipationSummary): JsonObject;
}

function checkInMilestone(
  count: number,
  name: string,
  earnedLine: string,
): AwardDefinition {
  return {
    key: `milestone.checkins.${String(count)}`,
    kind: 'milestone',
    name,
    condition: `Check in on ${String(count)} days.`,
    earnedLine,
    earned: (summary) => summary.checkIns >= count,
    evidence: (summary) => ({ checkIns: summary.checkIns, threshold: count }),
  };
}

function winMilestone(count: number, name: string, earnedLine: string): AwardDefinition {
  return {
    key: `milestone.wins.${String(count)}`,
    kind: 'milestone',
    name,
    condition: `Share ${String(count)} small wins.`,
    earnedLine,
    earned: (summary) => summary.wins >= count,
    evidence: (summary) => ({ wins: summary.wins, threshold: count }),
  };
}

/**
 * The thresholds widen, for the same reason the rank ladder does: even spacing
 * rewards volume, widening spacing rewards staying. They are also deliberately
 * sparse — eleven awards, not fifty. A wall of badges is a collection game, and
 * the brief asks for the opposite of one.
 */
export const AWARD_DEFINITIONS: readonly AwardDefinition[] = [
  checkInMilestone(1, 'First Check-in', 'Everything begins quietly. You began.'),
  checkInMilestone(10, 'Ten Days', 'Ten days of showing up.'),
  checkInMilestone(50, 'Fifty Days', 'Fifty days, at whatever pace suited you.'),
  checkInMilestone(100, 'One Hundred Days', 'A hundred days. That is a long way.'),
  checkInMilestone(250, 'Two Hundred and Fifty Days', 'Still here, and still arriving.'),

  winMilestone(1, 'First Win', 'The first one shared is the hardest.'),
  winMilestone(10, 'Ten Wins', 'Ten things that went well, said out loud.'),
  winMilestone(50, 'Fifty Wins', 'Fifty good days noticed and kept.'),

  {
    key: 'achievement.returned',
    kind: 'achievement',
    name: 'Came Back',
    condition: 'Return and check in after a month or more away.',
    /*
     * The one award this platform most wants to give. Leaving and coming back
     * is the normal shape of a long relationship with any habit, and it is the
     * moment people most expect to be told off.
     */
    earnedLine: 'You came back. That counts for more than never leaving.',
    earned: (summary) => summary.longestGapDays >= 30,
    evidence: (summary) => ({ longestGapDays: summary.longestGapDays }),
  },
  {
    key: 'achievement.both_in_a_day',
    kind: 'achievement',
    name: 'Arrived and Shared',
    condition: 'Check in and share a win on the same day, ten times.',
    earnedLine: 'Ten days of both arriving and saying what went well.',
    earned: (summary) => summary.daysWithBoth >= 10,
    evidence: (summary) => ({ daysWithBoth: summary.daysWithBoth }),
  },
  {
    key: 'achievement.six_months',
    kind: 'achievement',
    name: 'Six Seasons',
    condition: 'Check in during six different calendar months.',
    /*
     * Months rather than consecutive months. Six separate months over two years
     * earns this exactly as much as six in a row, which is the point: it
     * recognises a long relationship without requiring an unbroken one.
     */
    earnedLine: 'Six months with a day in each. Seasons change; you kept coming back.',
    earned: (summary) => summary.months >= 6,
    evidence: (summary) => ({ months: summary.months }),
  },
];

export const MILESTONES = AWARD_DEFINITIONS.filter((award) => award.kind === 'milestone');
export const ACHIEVEMENTS = AWARD_DEFINITIONS.filter(
  (award) => award.kind === 'achievement',
);

export function awardByKey(key: string): AwardDefinition | undefined {
  return AWARD_DEFINITIONS.find((award) => award.key === key);
}
