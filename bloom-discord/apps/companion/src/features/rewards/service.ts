import {
  bloomError,
  DAILY_SMALL_WIN_LIMIT,
  POINT_AWARDS,
  pointsToNextRank,
  rankForPoints,
  type CorrelationId,
  type GuildId,
  type Rank,
  type UserId,
} from '@bloom/shared-types';
import type { PlatformConfig } from '@bloom/config';
import type { PointEvent, Repositories } from '@bloom/database';
import type { MessagingService } from '@bloom/discord';
import type { Logger } from '@bloom/logging';
import {
  DAY_MS,
  idempotencyKey,
  localDateIn,
  localDaysBetween,
  shiftLocalDate,
  systemClock,
  type Clock,
  type LocalDate,
} from '@bloom/utils';

/**
 * Bloom Rewards.
 *
 * The whole of the points economy lives behind this class: check-ins, shared
 * wins, balances, ranks and the leaderboard. Nothing else in Companion calls
 * `repositories.rewards` directly, which keeps every rule about what an action
 * is worth in one readable file.
 *
 * ## What this deliberately does not do
 *
 * No streak bonuses, no multipliers, no catch-up awards, no "you are on fire"
 * escalation. A streak is *displayed* because it is a true fact about someone's
 * participation, but it changes nothing about what they earn. The moment a
 * streak pays, missing a day acquires a cost, and a wellbeing community that
 * charges people for a bad week has picked the wrong incentive.
 *
 * ## Rewards can be switched off
 *
 * With `FEATURE_REWARDS=false` the community features still work — a check-in
 * is still recorded, a win is still shared — and simply pay nothing. That is a
 * more honest degradation than hiding the commands, and it means a server can
 * run Bloom's community loop without a points economy at all.
 */

export interface RewardsServiceOptions {
  readonly config: PlatformConfig;
  readonly repositories: Repositories;
  readonly messaging: MessagingService;
  readonly logger: Logger;
  readonly clock?: Clock;
}

export interface CheckInRequest {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly correlationId: CorrelationId;
}

export interface RankMove {
  readonly from: Rank;
  readonly to: Rank;
}

export type CheckInResult =
  | {
      readonly kind: 'recorded';
      readonly pointsAwarded: number;
      readonly balance: number;
      readonly streak: number;
      readonly rankMove: RankMove | null;
    }
  | { readonly kind: 'already_today'; readonly streak: number };

export interface ShareWinRequest {
  readonly guildId: GuildId;
  readonly userId: UserId;
  /** Already sanitised by the command layer before it reaches here. */
  readonly description: string;
  readonly interactionId: string;
  readonly correlationId: CorrelationId;
}

export type ShareWinResult =
  | {
      readonly kind: 'shared';
      readonly pointsAwarded: number;
      readonly balance: number;
      readonly rankMove: RankMove | null;
      /** True when the win posted publicly; false when no channel is configured. */
      readonly posted: boolean;
    }
  | {
      /** Shared and posted, but past the daily cap, so it paid nothing. */
      readonly kind: 'shared_unpaid';
      readonly balance: number;
      readonly posted: boolean;
    }
  | { readonly kind: 'duplicate' };

export interface MemberProfile {
  readonly userId: UserId;
  readonly balance: number;
  readonly rank: Rank;
  readonly next: { readonly rank: Rank; readonly remaining: number } | null;
  readonly streak: number;
  readonly checkInsLast30Days: number;
  readonly recent: readonly PointEvent[];
  /** False when FEATURE_REWARDS is off, so the caller can say so plainly. */
  readonly rewardsEnabled: boolean;
}

/** How far back a streak is allowed to reach. Bounds the query, and no one */
/** needs to be told their streak is 400 days for it to mean something. */
const STREAK_WINDOW_DAYS = 120;

export class RewardsService {
  private readonly clock: Clock;
  private readonly logger: Logger;

  public constructor(private readonly options: RewardsServiceOptions) {
    this.clock = options.clock ?? systemClock;
    this.logger = options.logger.child({ context: { feature: 'rewards' } });
  }

  private get enabled(): boolean {
    return this.options.config.features.rewards;
  }

  /** The community's calendar date right now. */
  public today(): LocalDate {
    return localDateIn(this.clock.date(), this.options.config.runtime.timezone);
  }

  /**
   * A member marking that they showed up today.
   *
   * The database decides whether today is already claimed — the primary key on
   * `check_ins` is the once-a-day rule — so two taps a second apart cannot both
   * pay. Nothing the member writes is stored: `/checkin` records attendance,
   * not a mood log.
   */
  public async checkIn(request: CheckInRequest): Promise<CheckInResult> {
    const today = this.today();
    const before = await this.options.repositories.rewards.balance(
      request.guildId,
      request.userId,
    );

    const outcome = await this.options.repositories.rewards.recordCheckIn({
      guildId: request.guildId,
      userId: request.userId,
      localDate: today,
      points: this.enabled ? POINT_AWARDS.check_in : 0,
      correlationId: request.correlationId,
    });

    if (outcome.kind === 'already_today') {
      return {
        kind: 'already_today',
        streak: await this.streak(request.guildId, request.userId, today),
      };
    }

    const streak = await this.streak(request.guildId, request.userId, today);
    const awarded = outcome.event?.points ?? 0;

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'companion',
      event: 'rewards.check_in',
      actorId: request.userId,
      targetId: request.userId,
      severity: 'info',
      source: 'checkin',
      correlationId: request.correlationId,
      // The date and the award, never how anyone said they were feeling.
      details: { localDate: today, points: awarded, streak },
    });

    return {
      kind: 'recorded',
      pointsAwarded: awarded,
      balance: outcome.balance,
      streak,
      rankMove: rankMove(before, outcome.balance),
    };
  }

  /**
   * A member sharing something that went well.
   *
   * The text goes to the small-wins channel and nowhere else. It is not written
   * to the ledger, the audit row or the logs — a member's own words belong in
   * the place they chose to put them, and a database of everybody's good news
   * is a data-protection liability with no operational purpose.
   */
  public async shareWin(request: ShareWinRequest): Promise<ShareWinResult> {
    const rewards = this.options.repositories.rewards;

    /*
     * The claim comes before the post, and that order is the duplicate
     * prevention.
     *
     * Discord redelivers interactions, and a member can submit twice faster
     * than the first call returns. Posting first and reconciling afterwards
     * would put the same win in the channel twice while paying for it once —
     * the visible half of the failure, and the half the ledger cannot fix.
     *
     * The ledger's own idempotency key would cover the paid path, but not the
     * unpaid one: a win past the daily cap writes no ledger row and would have
     * nothing to collide with. So the claim is taken here, for every win,
     * whether or not it earns anything.
     */
    const claim = await this.options.repositories.idempotency.claim(
      idempotencyKey('rewards.small_win', request.guildId, request.interactionId),
      {
        botName: 'companion',
        operation: 'rewards.small_win',
        guildId: request.guildId,
        correlationId: request.correlationId,
      },
    );

    if (!claim.claimed) return { kind: 'duplicate' };

    const paidToday = await rewards.countKindSince(
      request.guildId,
      request.userId,
      'small_win',
      this.startOfToday(),
    );
    const withinCap = this.enabled && paidToday < DAILY_SMALL_WIN_LIMIT;

    const posted = await this.postWin(request);

    if (!withinCap) {
      /*
       * Past the cap, or rewards are off. The win was still shared — capping
       * the reward must never cap the participation, so there is no refusal
       * here and no telling-off, just no points.
       */
      return {
        kind: 'shared_unpaid',
        balance: await rewards.balance(request.guildId, request.userId),
        posted,
      };
    }

    const before = await rewards.balance(request.guildId, request.userId);
    const outcome = await rewards.award({
      guildId: request.guildId,
      userId: request.userId,
      kind: 'small_win',
      points: POINT_AWARDS.small_win,
      /*
       * Keyed on the interaction as well as the claim above. Belt and braces,
       * and cheap: the claim guards the post, this guards the payment, and the
       * two are written by different tables in different transactions.
       */
      idempotencyKey: `small_win:${request.guildId}:${request.interactionId}`,
      correlationId: request.correlationId,
    });

    if (outcome.kind === 'insufficient') {
      // Unreachable for a positive award; narrowing rather than a cast.
      throw bloomError('INVALID_INPUT', {
        operatorHint: 'A small-win award must be positive.',
      });
    }

    if (outcome.kind === 'duplicate') {
      return { kind: 'duplicate' };
    }

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'companion',
      event: 'rewards.small_win',
      actorId: request.userId,
      targetId: request.userId,
      severity: 'info',
      source: 'win',
      correlationId: request.correlationId,
      // Deliberately no description of the win. See the doc comment above.
      details: { points: outcome.event.points, posted },
    });

    return {
      kind: 'shared',
      pointsAwarded: outcome.event.points,
      balance: outcome.balance,
      rankMove: rankMove(before, outcome.balance),
      posted,
    };
  }

  public async profile(guildId: GuildId, userId: UserId): Promise<MemberProfile> {
    const rewards = this.options.repositories.rewards;
    const today = this.today();

    const [balance, recent, dates] = await Promise.all([
      rewards.balance(guildId, userId),
      rewards.recentEvents(guildId, userId, 5),
      rewards.checkInDates(guildId, userId, shiftLocalDate(today, -STREAK_WINDOW_DAYS)),
    ]);

    const monthAgo = shiftLocalDate(today, -29);

    return {
      userId,
      balance,
      rank: rankForPoints(balance),
      next: pointsToNextRank(balance),
      streak: streakFrom(dates, today),
      checkInsLast30Days: dates.filter((date) => date >= monthAgo).length,
      recent,
      rewardsEnabled: this.enabled,
    };
  }

  /**
   * The top of the board over a rolling window.
   *
   * Takes a number of days rather than an instant, so the clock stays inside
   * this class. The command layer computing its own `since` from `Date.now()`
   * is the kind of thing that works in production and quietly returns an empty
   * board under a test clock — which is exactly how it was caught.
   */
  public leaderboard(
    guildId: GuildId,
    options: { readonly days: number; readonly limit?: number },
  ): Promise<readonly { userId: UserId; points: number; events: number }[]> {
    const since = new Date(this.clock.now() - options.days * DAY_MS);
    return Promise.resolve(
      this.options.repositories.rewards.leaderboard(guildId, {
        since,
        ...(options.limit === undefined ? {} : { limit: options.limit }),
      }),
    );
  }

  /** Midnight this morning, in the community's timezone, as an instant. */
  private startOfToday(): Date {
    const today = this.today();
    const guess = new Date(`${today}T00:00:00Z`);
    /*
     * `today` is a wall-clock date, so midnight there is not midnight UTC. Walk
     * back hour by hour until the instant lands on the previous local day, then
     * step forward one: correct in every timezone including the half-hour and
     * three-quarter-hour offsets, without a timezone database of our own.
     */
    for (let hours = -14; hours <= 14; hours += 1) {
      const candidate = new Date(guess.getTime() + hours * 3_600_000);
      if (localDateIn(candidate, this.options.config.runtime.timezone) === today) {
        return candidate;
      }
    }
    return guess;
  }

  private async streak(
    guildId: GuildId,
    userId: UserId,
    today: LocalDate,
  ): Promise<number> {
    const dates = await this.options.repositories.rewards.checkInDates(
      guildId,
      userId,
      shiftLocalDate(today, -STREAK_WINDOW_DAYS),
    );
    return streakFrom(dates, today);
  }

  private async postWin(request: ShareWinRequest): Promise<boolean> {
    const channel = this.options.config.channels.smallWins;
    if (!channel) {
      this.logger.debug(
        'rewards.win_not_posted',
        'CHANNEL_SMALL_WINS is not configured, so the win was not posted.',
      );
      return false;
    }

    try {
      await this.options.messaging.sendToChannel(request.guildId, channel, {
        content: `<@${request.userId}> shared a small win:\n> ${request.description}`,
      });
      return true;
    } catch (error) {
      /*
       * A failed post must not cost the member their points. The win happened;
       * Discord being unavailable is our problem, not theirs.
       */
      this.logger.warn(
        'rewards.win_post_failed',
        'Could not post a small win to the configured channel.',
        { error },
      );
      return false;
    }
  }
}

/** Rank before and after an award, or null when nothing changed. */
function rankMove(before: number, after: number): RankMove | null {
  const from = rankForPoints(before);
  const to = rankForPoints(after);
  return from === to ? null : { from, to };
}

/**
 * Consecutive days ending today or yesterday.
 *
 * Derived from the dates, never stored. A stored counter has to be maintained
 * by something that runs every night, and the night it does not run it starts
 * lying — which is worse than the feature not existing, because members compare
 * these with each other.
 *
 * Yesterday counts as an unbroken streak so that someone who has not checked in
 * *yet* today is not told their streak is zero at nine in the morning.
 */
export function streakFrom(dates: readonly LocalDate[], today: LocalDate): number {
  const present = new Set(dates);
  const start = present.has(today) ? today : shiftLocalDate(today, -1);
  if (!present.has(start)) return 0;

  let streak = 0;
  let cursor = start;
  while (present.has(cursor)) {
    streak += 1;
    cursor = shiftLocalDate(cursor, -1);
    // A window this wide has already stopped being a useful number.
    if (localDaysBetween(cursor, today) > STREAK_WINDOW_DAYS) break;
  }
  return streak;
}
