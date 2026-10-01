import type { PlatformConfig } from '@bloom/config';
import type { CompanionRepositories } from '@bloom/database';
import type { CommunityActivity, CompletionCount, MemberAward } from '@bloom/database';
import type { GuildId, UserId } from '@bloom/shared-types';

/**
 * The read side of the community.
 *
 * Everything here is a question, never a change. No method on this service
 * writes a row, awards a point, grants an achievement or mutates a
 * participation record — it has no path to any of those, because the services
 * that own them are not among its dependencies. That is the whole design: the
 * surfaces that make the community feel alive are the ones most likely to grow
 * "while we are here, let us also give them a badge", and the cheapest way to
 * refuse that is to build them somewhere with nothing to give.
 *
 * ## Why one service for five surfaces
 *
 * The leaderboard, the two member views, the weekly recap and the staff
 * overview ask overlapping questions of the same four repositories. Five
 * separate readers would have meant five slightly different definitions of
 * "this week" and "a completion", and they would have disagreed with each
 * other in public — the recap saying 14 completions on Monday morning and the
 * board saying 13. One service, one window helper, one set of definitions.
 *
 * ## What it is not
 *
 * Not analytics. There is no retention curve, no cohort, no funnel, no trend
 * arrow. Everything returned is a count over a stated window or a short
 * ordered list, because that is what the data honestly supports and anything
 * cleverer would be a chart whose shape nobody could defend.
 */

/** What a board can rank. Four, because four are what the data supports. */
export const BOARD_CATEGORIES = ['points', 'referrals', 'challenges', 'events'] as const;

export type BoardCategory = (typeof BOARD_CATEGORIES)[number];

export const BOARD_PERIODS = ['week', 'month', 'all'] as const;

export type BoardPeriod = (typeof BOARD_PERIODS)[number];

export const PERIOD_DAYS: Readonly<Record<BoardPeriod, number | null>> = {
  week: 7,
  month: 30,
  all: null,
};

/**
 * Which categories may be ranked all-time.
 *
 * Points may not, and the reason is not performance. A points board is a
 * rate — it is meant to show what is happening in the community now, and
 * summing the ledger since the beginning turns it into a seniority list that
 * the earliest members win permanently. A member who joined last week can top
 * the 7-day board; they can never top an all-time one, and showing them a
 * ranking they are structurally excluded from is worse than not showing it.
 *
 * The three count categories are different in kind. "Twelve people invited who
 * stayed" is a record of something done, not a rate, and an all-time view of
 * it is the natural way to read it. They are also far smaller numbers, so the
 * board stays legible rather than becoming a wall of six-figure totals.
 */
const ALL_TIME_CATEGORIES: readonly BoardCategory[] = [
  'referrals',
  'challenges',
  'events',
];

export function supportsAllTime(category: BoardCategory): boolean {
  return ALL_TIME_CATEGORIES.includes(category);
}

export interface BoardEntry {
  readonly userId: UserId;
  /** Points for the points board, a count for the other three. */
  readonly value: number;
}

export interface BoardResult {
  readonly category: BoardCategory;
  /** What was asked for. */
  readonly requested: BoardPeriod;
  /** What was actually used. Differs only when all-time was unavailable. */
  readonly period: BoardPeriod;
  readonly entries: readonly BoardEntry[];
}

/** The recognition view: who, and what they have been recognised for. */
export interface HighlightsView {
  readonly topContributors: readonly BoardEntry[];
  readonly topReferrers: readonly BoardEntry[];
  readonly achievements: readonly MemberAward[];
  readonly milestones: readonly MemberAward[];
  readonly since: Date;
}

/** The live view: what is running, and how much is going on. */
export interface StatusView {
  readonly challenges: readonly CommunityActivity[];
  readonly currentEvents: readonly CommunityActivity[];
  readonly upcomingEvents: readonly CommunityActivity[];
  readonly participation: {
    readonly challengeCompletions: number;
    readonly eventCompletions: number;
    readonly members: number;
  };
  readonly points: {
    readonly awarded: number;
    readonly events: number;
    readonly members: number;
  };
  readonly since: Date;
  readonly now: Date;
}

/** One week of community activity, as the recap reports it. */
export interface RecapSummary {
  readonly from: Date;
  readonly to: Date;
  readonly participatingMembers: number;
  readonly pointsAwarded: number;
  readonly referrals: number;
  readonly challengeCompletions: number;
  readonly eventCompletions: number;
  readonly awards: readonly MemberAward[];
  readonly topContributors: readonly BoardEntry[];
  /** True when nothing at all happened. The recap says so rather than lying. */
  readonly quiet: boolean;
}

export interface ActivityParticipation {
  readonly activity: CommunityActivity;
  readonly joined: number;
  readonly completed: number;
}

/** The staff read: the same facts, plus the operational ones members skip. */
export interface StaffOverview {
  readonly challenges: readonly ActivityParticipation[];
  readonly events: readonly ActivityParticipation[];
  readonly upcomingEvents: readonly ActivityParticipation[];
  readonly rewards: {
    readonly points: number;
    readonly events: number;
    readonly members: number;
  };
  readonly referrals: number;
  readonly awards: readonly MemberAward[];
  readonly since: Date;
}

export interface HighlightsServiceOptions {
  readonly config: PlatformConfig;
  readonly repositories: CompanionRepositories;
  /** Injected, so every window in a test is the test's choice. */
  readonly now: () => Date;
}

/** How many rows any one section shows. Short on purpose; see the brief. */
const BOARD_LIMIT = 10;
const HIGHLIGHT_LIMIT = 5;
const STAFF_ACTIVITY_LIMIT = 5;
const RECAP_CONTRIBUTORS = 5;
const RECAP_AWARDS = 5;

const HIGHLIGHT_WINDOW_DAYS = 30;
const STATUS_WINDOW_DAYS = 7;
const STAFF_WINDOW_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBefore(instant: Date, days: number): Date {
  return new Date(instant.getTime() - days * MS_PER_DAY);
}

export class HighlightsService {
  public constructor(private readonly options: HighlightsServiceOptions) {}

  /** The platform clock, exposed so jobs and commands share one "now". */
  public clock(): Date {
    return this.options.now();
  }

  /**
   * One board, four categories.
   *
   * The category decides which repository answers; the period decides the
   * window. Both are resolved here rather than at the command layer so that
   * the recap and the member board cannot drift apart on what "last 7 days"
   * means.
   */
  public async leaderboard(input: {
    readonly guildId: GuildId;
    readonly category: BoardCategory;
    readonly period: BoardPeriod;
    readonly limit?: number;
  }): Promise<BoardResult> {
    const limit = input.limit ?? BOARD_LIMIT;
    const period =
      input.period === 'all' && !supportsAllTime(input.category) ? 'month' : input.period;

    const days = PERIOD_DAYS[period];
    const since = days === null ? undefined : daysBefore(this.clock(), days);

    const entries = await this.entriesFor(input.guildId, input.category, since, limit);

    return { category: input.category, requested: input.period, period, entries };
  }

  private async entriesFor(
    guildId: GuildId,
    category: BoardCategory,
    since: Date | undefined,
    limit: number,
  ): Promise<readonly BoardEntry[]> {
    const { rewards, referrals, community } = this.options.repositories;
    const window = since ? { since, limit } : { limit };

    switch (category) {
      case 'points': {
        const rows = await rewards.leaderboard(guildId, window);
        return rows.map((row) => ({ userId: row.userId, value: row.points }));
      }
      case 'referrals': {
        const rows = await referrals.qualifiedLeaderboard(guildId, window);
        return toEntries(rows);
      }
      case 'challenges': {
        const rows = await community.completionLeaderboard(guildId, {
          ...window,
          kind: 'challenge',
        });
        return toEntries(rows);
      }
      case 'events': {
        const rows = await community.completionLeaderboard(guildId, {
          ...window,
          kind: 'event',
        });
        return toEntries(rows);
      }
    }
  }

  /**
   * Recognition: the people, and what they have been recognised for.
   *
   * Thirty days rather than seven. Recognition is sparser than activity — a
   * week can pass with no achievement earned at all, and a section that is
   * usually empty teaches members not to look at it.
   */
  public async highlights(guildId: GuildId): Promise<HighlightsView> {
    const since = daysBefore(this.clock(), HIGHLIGHT_WINDOW_DAYS);

    const [topContributors, topReferrers, recent] = await Promise.all([
      this.leaderboard({
        guildId,
        category: 'points',
        period: 'week',
        limit: HIGHLIGHT_LIMIT,
      }),
      this.leaderboard({
        guildId,
        category: 'referrals',
        period: 'month',
        limit: HIGHLIGHT_LIMIT,
      }),
      /*
       * One query for both kinds, split below. Two queries would have been
       * two round trips for the same index scan, and the split is a property
       * of the row rather than of the question.
       */
      this.options.repositories.awards.recent(guildId, {
        since,
        limit: HIGHLIGHT_LIMIT * 2,
      }),
    ]);

    return {
      topContributors: topContributors.entries,
      topReferrers: topReferrers.entries,
      achievements: recent
        .filter((award) => award.kind === 'achievement')
        .slice(0, HIGHLIGHT_LIMIT),
      milestones: recent
        .filter((award) => award.kind === 'milestone')
        .slice(0, HIGHLIGHT_LIMIT),
      since,
    };
  }

  /** What is running right now, and how much has been going on this week. */
  public async status(guildId: GuildId): Promise<StatusView> {
    const now = this.clock();
    const since = daysBefore(now, STATUS_WINDOW_DAYS);
    const { community, rewards } = this.options.repositories;

    const [
      challenges,
      currentEvents,
      upcomingEvents,
      challengeTotals,
      eventTotals,
      points,
    ] = await Promise.all([
      community.openAt(guildId, 'challenge', now),
      community.openAt(guildId, 'event', now),
      community.upcomingAfter(guildId, 'event', now, HIGHLIGHT_LIMIT),
      /*
       * No upper bound. These are live views, so "up to now" means "and
       * anything since" — bounding them at the instant the clock was read
       * would drop whatever happened in that same millisecond, which is
       * exactly the check-in that prompted someone to run the command.
       */
      community.completionTotals(guildId, 'challenge', since, null),
      community.completionTotals(guildId, 'event', since, null),
      rewards.activitySummary(guildId, since, null),
    ]);

    return {
      challenges,
      currentEvents,
      upcomingEvents,
      participation: {
        challengeCompletions: challengeTotals.completions,
        eventCompletions: eventTotals.completions,
        /*
         * Not a sum of the two. Someone who finished a challenge and an event
         * is one participating member, and adding the two member counts would
         * double-count exactly the people who did the most. Reported as the
         * larger of the two instead, which is the strongest claim the data
         * supports without a third query joining them.
         */
        members: Math.max(challengeTotals.members, eventTotals.members),
      },
      points: {
        awarded: points.points,
        events: points.events,
        members: points.members,
      },
      since,
      now,
    };
  }

  /**
   * One week, summarised.
   *
   * The window is passed in rather than derived from the clock: the recap job
   * computes it from the run's scheduled instant, so a run that starts late —
   * or is retried an hour later — reports the same week it would have
   * reported on time. A recap that silently changed its window when it was
   * retried would publish two different summaries of the same seven days.
   */
  public async recap(input: {
    readonly guildId: GuildId;
    readonly from: Date;
    readonly to: Date;
  }): Promise<RecapSummary> {
    const { guildId, from, to } = input;
    const { rewards, referrals, community, awards } = this.options.repositories;

    const [points, referralCount, challengeTotals, eventTotals, recentAwards, top] =
      await Promise.all([
        rewards.activitySummary(guildId, from, to),
        referrals.countQualifiedInWindow(guildId, from, to),
        community.completionTotals(guildId, 'challenge', from, to),
        community.completionTotals(guildId, 'event', from, to),
        awards.recent(guildId, { since: from, limit: RECAP_AWARDS }),
        rewards.leaderboard(guildId, { since: from, limit: RECAP_CONTRIBUTORS }),
      ]);

    const topContributors = top.map((row) => ({
      userId: row.userId,
      value: row.points,
    }));

    return {
      from,
      to,
      participatingMembers: points.members,
      pointsAwarded: points.points,
      referrals: referralCount,
      challengeCompletions: challengeTotals.completions,
      eventCompletions: eventTotals.completions,
      awards: recentAwards,
      topContributors,
      quiet:
        points.events === 0 &&
        referralCount === 0 &&
        challengeTotals.completions === 0 &&
        eventTotals.completions === 0 &&
        recentAwards.length === 0,
    };
  }

  /**
   * The staff read.
   *
   * Same facts as the member views, plus per-activity participation counts
   * and a thirty-day economic summary. Deliberately not a superset of
   * everything staff could possibly want: no per-member breakdown, no list of
   * who joined what. Those exist on the activity-specific commands, where the
   * staff member has said which activity they mean.
   */
  public async staffOverview(guildId: GuildId): Promise<StaffOverview> {
    const now = this.clock();
    const since = daysBefore(now, STAFF_WINDOW_DAYS);
    const { community, rewards, referrals, awards } = this.options.repositories;

    const [openChallenges, openEvents, upcoming, rewardTotals, referralCount, recent] =
      await Promise.all([
        community.openAt(guildId, 'challenge', now),
        community.openAt(guildId, 'event', now),
        community.upcomingAfter(guildId, 'event', now, STAFF_ACTIVITY_LIMIT),
        rewards.activitySummary(guildId, since, null),
        referrals.countQualifiedInWindow(guildId, since, null),
        awards.recent(guildId, { since, limit: HIGHLIGHT_LIMIT }),
      ]);

    const [challenges, events, upcomingEvents] = await Promise.all([
      this.withCounts(openChallenges.slice(0, STAFF_ACTIVITY_LIMIT)),
      this.withCounts(openEvents.slice(0, STAFF_ACTIVITY_LIMIT)),
      this.withCounts(upcoming),
    ]);

    return {
      challenges,
      events,
      upcomingEvents,
      rewards: {
        points: rewardTotals.points,
        events: rewardTotals.events,
        members: rewardTotals.members,
      },
      referrals: referralCount,
      awards: recent,
      since,
    };
  }

  /**
   * One count query per activity.
   *
   * Bounded by the slice above, never by what the guild happens to contain.
   * The same shape `event-list` uses, and the same honest limitation: this is
   * N+1, and it is acceptable only because N is capped at five.
   */
  private async withCounts(
    activities: readonly CommunityActivity[],
  ): Promise<readonly ActivityParticipation[]> {
    return await Promise.all(
      activities.map(async (activity) => {
        const counts = await this.options.repositories.community.counts(activity.id);
        return { activity, joined: counts.joined, completed: counts.completed };
      }),
    );
  }
}

function toEntries(rows: readonly CompletionCount[]): readonly BoardEntry[] {
  return rows.map((row) => ({ userId: row.userId, value: row.count }));
}
