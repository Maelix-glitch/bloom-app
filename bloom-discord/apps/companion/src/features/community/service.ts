import type { PlatformConfig } from '@bloom/config';
import type {
  ActivityKind,
  ChallengeMetric,
  CommunityActivity,
  CommunityParticipant,
  Repositories,
} from '@bloom/database';
import type { MessagingService } from '@bloom/discord';
import type { Logger } from '@bloom/logging';
import {
  bloomError,
  type CorrelationId,
  type GuildId,
  type UserId,
} from '@bloom/shared-types';
import type { AwardsService } from '../awards/service.js';
import type { RewardsService } from '../rewards/service.js';
import {
  ACTIVITY_REWARD_LIMIT,
  activityPointKind,
  completionIdempotencyKey,
} from './rules.js';
import * as copy from './messages.js';

/**
 * Challenges and events, run by one service.
 *
 * ## Why one service and not two
 *
 * A challenge and an event feel different to a member and are nearly
 * identical to the platform. Both are bounded by time. Both produce one
 * participation record per member. Both complete exactly once, pay through
 * the same ledger, may unlock the same kind of achievement, and must be
 * audited the same way.
 *
 * The only real difference is **how completion is decided**:
 *
 *   • A challenge is *computed*. Nobody signs up; the member is already
 *     checking in, and the platform notices when the count crosses a target.
 *   • An event is *declared*. Members sign up, and staff state afterwards
 *     whether it happened.
 *
 * That difference is one method (`evaluateChallenges` versus `closeEvent`)
 * feeding one shared completion path (`completeParticipant`). Splitting this
 * into two services would have duplicated the payment, the idempotency key,
 * the achievement hook and the audit row — and the duplicate is always the
 * one that later forgets the audit row.
 *
 * ## What this service may not do
 *
 * It never writes a balance. `RewardsService` owns the ledger, and the only
 * reward call here goes through it. There is deliberately no path from a
 * staff command to a point total that does not pass through that service and
 * its idempotency index.
 */

export interface CommunityServiceOptions {
  readonly config: PlatformConfig;
  readonly repositories: Repositories;
  readonly messaging: MessagingService;
  readonly logger: Logger;
  readonly rewards: RewardsService;
  readonly awards: AwardsService;
  /** The platform clock. Never `Date.now()` directly. */
  readonly now: () => Date;
}

export interface CreateActivityRequest {
  readonly guildId: GuildId;
  readonly kind: ActivityKind;
  readonly title: string;
  readonly description: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly targetMetric?: ChallengeMetric | null;
  readonly targetAmount?: number | null;
  readonly capacity?: number | null;
  readonly rewardPoints: number;
  readonly achievementKey?: string | null;
  readonly actorId: UserId;
  readonly correlationId: CorrelationId;
}

export interface CloseActivityRequest {
  readonly guildId: GuildId;
  readonly activityId: string;
  readonly outcome: 'completed' | 'cancelled';
  readonly actorId: UserId;
  readonly correlationId: CorrelationId;
}

export interface CloseActivityResult {
  readonly activity: CommunityActivity;
  /** How many members were paid by this close. Zero for a cancellation. */
  readonly completed: number;
  /** Members whose payment failed and who remain owed. */
  readonly failed: number;
}

export type JoinResult =
  | { readonly kind: 'joined'; readonly activity: CommunityActivity }
  | { readonly kind: 'already_joined'; readonly activity: CommunityActivity }
  | { readonly kind: 'full'; readonly activity: CommunityActivity }
  | { readonly kind: 'closed'; readonly activity: CommunityActivity }
  | { readonly kind: 'not_found' };

export type LeaveResult =
  | { readonly kind: 'withdrawn'; readonly activity: CommunityActivity }
  | { readonly kind: 'not_joined'; readonly activity: CommunityActivity }
  | { readonly kind: 'closed'; readonly activity: CommunityActivity }
  | { readonly kind: 'not_found' };

/** One challenge and how far the member is through it. */
export interface ChallengeProgress {
  readonly activity: CommunityActivity;
  readonly current: number;
  readonly target: number;
  readonly completed: boolean;
}

export class CommunityService {
  private readonly logger: Logger;

  public constructor(private readonly options: CommunityServiceOptions) {
    this.logger = options.logger.child({ context: { feature: 'community' } });
  }

  /**
   * The platform clock, exposed so command handlers resolve relative windows
   * against the same instant the service will validate them against.
   *
   * A handler calling `new Date()` itself would be a second clock, and the
   * two would disagree under a fake timer — which is exactly when a date
   * boundary test is trying to prove something.
   */
  public clock(): Date {
    return this.options.now();
  }

  /* ---------------------------------------------------------------------- *
   * Staff: lifecycle
   * ---------------------------------------------------------------------- */

  public async create(request: CreateActivityRequest): Promise<CommunityActivity> {
    this.validate(request);

    const activity = await this.options.repositories.community.create({
      guildId: request.guildId,
      kind: request.kind,
      title: request.title,
      description: request.description,
      startsAt: request.startsAt,
      endsAt: request.endsAt,
      targetMetric: request.targetMetric ?? null,
      targetAmount: request.targetAmount ?? null,
      capacity: request.capacity ?? null,
      rewardPoints: request.rewardPoints,
      achievementKey: request.achievementKey ?? null,
      createdBy: request.actorId,
      correlationId: request.correlationId,
    });

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'companion',
      event: 'community.created',
      actorId: request.actorId,
      targetId: null,
      /*
       * Warn, matching manual awards: a person chose to create something that
       * can pay points. The audit trail for "who authorised this payout" has
       * to start at the creation, not at the completion.
       */
      severity: 'warn',
      source: 'community',
      correlationId: request.correlationId,
      details: {
        activity_id: activity.id,
        kind: activity.kind,
        reward_points: activity.rewardPoints,
        ...(activity.targetMetric ? { target_metric: activity.targetMetric } : {}),
        ...(activity.targetAmount !== null
          ? { target_amount: activity.targetAmount }
          : {}),
        ...(activity.capacity !== null ? { capacity: activity.capacity } : {}),
        ...(activity.achievementKey ? { achievement_key: activity.achievementKey } : {}),
      },
    });

    await this.announce(activity);
    return activity;
  }

  /**
   * Close an activity, paying participants if it happened.
   *
   * `completed` pays everyone who joined and had not withdrawn; `cancelled`
   * pays nobody. Both are a staff decision rather than a timer, because the
   * platform has no way to observe whether an event actually took place —
   * Discord offers no attendance signal, and inferring one from voice or
   * message activity would be a different feature with its own false
   * positives. An honest "staff said it happened" beats an invented
   * attendance record.
   *
   * For challenges, closing is purely administrative: members were already
   * paid as they crossed the target, so a close only stops further
   * completions.
   */
  public async close(request: CloseActivityRequest): Promise<CloseActivityResult> {
    const closedAt = this.options.now();

    const activity = await this.options.repositories.community.close({
      guildId: request.guildId,
      activityId: request.activityId,
      status: request.outcome,
      closedBy: request.actorId,
      closedAt,
    });

    if (!activity) {
      throw bloomError('INVALID_INPUT', {
        operatorHint: `No open community activity ${request.activityId} in this guild. It may already be closed.`,
      });
    }

    let completed = 0;
    let failed = 0;

    if (request.outcome === 'completed' && activity.kind === 'event') {
      const participants = await this.options.repositories.community.participants(
        activity.id,
      );

      for (const participant of participants) {
        if (participant.state !== 'joined') continue;

        const paid = await this.completeParticipant(activity, participant.userId, {
          progress: null,
          correlationId: request.correlationId,
        });
        if (paid) completed += 1;
        else failed += 1;
      }
    }

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'companion',
      event: 'community.closed',
      actorId: request.actorId,
      targetId: null,
      severity: 'warn',
      source: 'community',
      correlationId: request.correlationId,
      details: {
        activity_id: activity.id,
        kind: activity.kind,
        outcome: request.outcome,
        completed,
        failed,
      },
    });

    return { activity, completed, failed };
  }

  /* ---------------------------------------------------------------------- *
   * Members: events
   * ---------------------------------------------------------------------- */

  public async join(request: {
    readonly guildId: GuildId;
    readonly activityId: string;
    readonly userId: UserId;
    readonly correlationId: CorrelationId;
  }): Promise<JoinResult> {
    const activity = await this.options.repositories.community.byId(
      request.guildId,
      request.activityId,
    );
    if (activity?.kind !== 'event') return { kind: 'not_found' };

    /*
     * Joining is allowed right up to the end of the window, including before
     * the event starts — signing up in advance is the normal case. It is
     * refused once staff have closed the activity or the window has passed,
     * because a join after that could never be paid and would be a record of
     * a thing that did not happen.
     */
    if (activity.status !== 'open' || this.options.now() >= activity.endsAt) {
      return { kind: 'closed', activity };
    }

    const outcome = await this.options.repositories.community.join({
      activityId: activity.id,
      guildId: request.guildId,
      userId: request.userId,
      capacity: activity.capacity,
      joinedAt: this.options.now(),
      correlationId: request.correlationId,
    });

    if (outcome.kind === 'full') return { kind: 'full', activity };

    /*
     * Deliberately no public announcement per join. A fifty-person event
     * would otherwise produce fifty messages in a channel, which is exactly
     * the spam the brief forbids. The member gets an ephemeral confirmation;
     * the room already saw the one announcement that matters.
     */
    return outcome.kind === 'joined'
      ? { kind: 'joined', activity }
      : { kind: 'already_joined', activity };
  }

  public async leave(request: {
    readonly guildId: GuildId;
    readonly activityId: string;
    readonly userId: UserId;
  }): Promise<LeaveResult> {
    const activity = await this.options.repositories.community.byId(
      request.guildId,
      request.activityId,
    );
    if (activity?.kind !== 'event') return { kind: 'not_found' };
    if (activity.status !== 'open') return { kind: 'closed', activity };

    const outcome = await this.options.repositories.community.leave(
      activity.id,
      request.guildId,
      request.userId,
    );

    return outcome === 'withdrawn'
      ? { kind: 'withdrawn', activity }
      : { kind: 'not_joined', activity };
  }

  public async info(
    guildId: GuildId,
    activityId: string,
    userId: UserId,
  ): Promise<{
    readonly activity: CommunityActivity;
    readonly counts: { joined: number; completed: number };
    readonly participant: CommunityParticipant | null;
  } | null> {
    const activity = await this.options.repositories.community.byId(guildId, activityId);
    if (!activity) return null;

    const [counts, participant] = await Promise.all([
      this.options.repositories.community.counts(activity.id),
      this.options.repositories.community.participant(activity.id, userId),
    ]);

    return { activity, counts, participant };
  }

  /** The member-facing event list, with whether they are in each one. */
  public async listForMember(
    guildId: GuildId,
    userId: UserId,
    kind: ActivityKind,
    limit?: number,
  ): Promise<
    readonly {
      readonly activity: CommunityActivity;
      readonly participant: CommunityParticipant | null;
    }[]
  > {
    const activities = await this.options.repositories.community.list(guildId, {
      kind,
      status: 'open',
      ...(limit === undefined ? {} : { limit }),
    });

    const mine = await this.options.repositories.community.memberActivityIds(
      guildId,
      userId,
      activities.map((activity) => activity.id),
    );

    return activities.map((activity) => ({
      activity,
      participant: mine.get(activity.id) ?? null,
    }));
  }

  /* ---------------------------------------------------------------------- *
   * Challenges: computed completion
   * ---------------------------------------------------------------------- */

  /**
   * Check every running challenge against what the member has actually done.
   *
   * Pull-based, exactly like `AwardsService.evaluate`: after an action that
   * could have moved a counter, re-read the counters and see what that
   * implies. No incremental tallies, so a challenge created mid-window
   * immediately counts activity from the start of its window, a retuned
   * target needs no backfill, and an outage costs nothing once the process is
   * back.
   *
   * Called after check-ins and small wins. Safe to call at any time: every
   * completion is guarded by the participant primary key.
   */
  public async evaluateChallenges(request: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly correlationId: CorrelationId;
  }): Promise<readonly CommunityActivity[]> {
    const now = this.options.now();
    const open = await this.options.repositories.community.openAt(
      request.guildId,
      'challenge',
      now,
    );
    if (open.length === 0) return [];

    const held = await this.options.repositories.community.memberActivityIds(
      request.guildId,
      request.userId,
      open.map((activity) => activity.id),
    );

    const completed: CommunityActivity[] = [];

    for (const activity of open) {
      // Already completed: skip before spending a metric query on it.
      if (held.has(activity.id)) continue;

      const current = await this.measure(activity, request.userId);
      if (activity.targetAmount === null || current < activity.targetAmount) continue;

      const paid = await this.completeParticipant(activity, request.userId, {
        progress: current,
        correlationId: request.correlationId,
      });
      if (paid) completed.push(activity);
    }

    return completed;
  }

  /** Running challenges and the member's position in each. */
  public async challengeProgress(
    guildId: GuildId,
    userId: UserId,
  ): Promise<readonly ChallengeProgress[]> {
    const open = await this.options.repositories.community.openAt(
      guildId,
      'challenge',
      this.options.now(),
    );
    if (open.length === 0) return [];

    const held = await this.options.repositories.community.memberActivityIds(
      guildId,
      userId,
      open.map((activity) => activity.id),
    );

    const entries: ChallengeProgress[] = [];
    for (const activity of open) {
      const record = held.get(activity.id);
      const isComplete = record?.state === 'completed';
      const current = isComplete
        ? (record.progress ?? activity.targetAmount ?? 0)
        : await this.measure(activity, userId);

      entries.push({
        activity,
        current,
        target: activity.targetAmount ?? 0,
        completed: isComplete,
      });
    }
    return entries;
  }

  /**
   * Count whatever this challenge measures.
   *
   * Three metrics, three queries, no interpreter. Each is a half-open window
   * `[starts_at, ends_at)` over records Companion already owns, so a member
   * cannot bring progress forward from before the challenge existed.
   */
  private async measure(activity: CommunityActivity, userId: UserId): Promise<number> {
    const { rewards, referrals, community } = this.options.repositories;
    const { guildId, startsAt, endsAt } = activity;

    switch (activity.targetMetric) {
      case 'check_ins':
        return await rewards.countEventsInWindow(
          guildId,
          userId,
          'check_in',
          startsAt,
          endsAt,
        );
      case 'qualified_referrals':
        return await referrals.countPaidForInviterInWindow(
          guildId,
          userId,
          startsAt,
          endsAt,
        );
      case 'event_participation':
        return await community.countCompletedEvents(guildId, userId, startsAt, endsAt);
      case null:
        /*
         * Unreachable: the SQL CHECK requires a challenge to have a metric,
         * and only challenges reach here. Returning zero rather than throwing
         * because a malformed row should fail to pay, not crash a check-in.
         */
        this.logger.error(
          'community.metric_missing',
          'A challenge has no target metric and cannot be evaluated.',
          { context: { activity_id: activity.id } },
        );
        return 0;
    }
  }

  /* ---------------------------------------------------------------------- *
   * The one completion path
   * ---------------------------------------------------------------------- */

  /**
   * Record a completion, pay for it, and recognise it. Once.
   *
   * Both features funnel here, and the ordering is the part that matters.
   *
   * ## Why the record is written before the payment
   *
   * The participant row is claimed first, with the state transition as the
   * lock (`WHERE state = 'joined'`, or an `ON CONFLICT DO NOTHING` insert for
   * challenges). Only the caller that wins the claim pays. A second caller —
   * a retry, a concurrent evaluation, a staff member closing twice — sees
   * `already_completed` and does nothing.
   *
   * That leaves one failure to survive: the claim succeeds and the payment
   * then fails. The member holds a completion with no points. This is
   * deliberate, and it is the better of the two failures available:
   *
   *   • It is **visible** — the participant row has a null `point_event_id`,
   *     which is a query, not an audit trawl.
   *   • It is **repairable** — the idempotency key is derived from the
   *     activity and the member, not from the attempt, so re-running the
   *     payment with the same key either pays once or reports a duplicate.
   *   • The inverse — pay first, then fail to record — would pay twice on the
   *     next retry if the idempotency index were ever missed.
   *
   * Returns whether the member ended up paid, so a caller can report how many
   * completions are still owed rather than claiming success for all of them.
   */
  private async completeParticipant(
    activity: CommunityActivity,
    userId: UserId,
    options: {
      readonly progress: number | null;
      readonly correlationId: CorrelationId;
    },
  ): Promise<boolean> {
    const { community } = this.options.repositories;

    const claim =
      activity.kind === 'challenge'
        ? await community.completeDirect({
            activityId: activity.id,
            guildId: activity.guildId,
            userId,
            progress: options.progress,
            correlationId: options.correlationId,
          })
        : await community.complete({
            activityId: activity.id,
            guildId: activity.guildId,
            userId,
            progress: options.progress,
            correlationId: options.correlationId,
          });

    if (claim.kind === 'already_completed') return false;

    const paid = await this.payCompletion(activity, userId, options.correlationId);

    await this.options.repositories.audit.append({
      guildId: activity.guildId,
      botName: 'companion',
      event: 'community.completed',
      actorId: null,
      targetId: userId,
      /*
       * Info: the platform applying a published rule. The staff decision that
       * authorised any payment was already recorded at `community.created`
       * and `community.closed`, both at warn.
       */
      severity: 'info',
      source: 'community',
      correlationId: options.correlationId,
      details: {
        activity_id: activity.id,
        kind: activity.kind,
        points: activity.rewardPoints,
        paid,
        ...(options.progress !== null ? { progress: options.progress } : {}),
      },
    });

    await this.unlockAchievement(activity, userId, options.correlationId);
    await this.announceCompletion(activity, userId);

    return paid;
  }

  /**
   * Pay a completion through `RewardsService`, or do nothing if it is free.
   *
   * A zero-point activity is normal and is not a failure — plenty of things
   * worth doing are their own reward, and the brief's whole stance on
   * recognition depends on that being expressible.
   */
  private async payCompletion(
    activity: CommunityActivity,
    userId: UserId,
    correlationId: CorrelationId,
  ): Promise<boolean> {
    if (activity.rewardPoints <= 0) return true;

    try {
      const result = await this.options.rewards.awardActivity({
        guildId: activity.guildId,
        userId,
        kind: activityPointKind(activity.kind),
        points: activity.rewardPoints,
        idempotencyKey: completionIdempotencyKey(activity.kind, activity.id, userId),
        correlationId,
      });
      return result.kind === 'paid';
    } catch (error) {
      /*
       * Not rethrown. One member's failed payment must not abort a close that
       * still has forty people to pay, and the completion record is already
       * written and repairable. The caller counts this as owed.
       */
      this.logger.error(
        'community.reward_failed',
        'A completion was recorded but its points could not be paid.',
        {
          error,
          context: {
            activity_id: activity.id,
            points: activity.rewardPoints,
          },
        },
      );
      return false;
    }
  }

  /**
   * Unlock the achievement this activity recognises, if it names one.
   *
   * Recognition only. The award grants no points — that rule lives in the
   * award definitions and is asserted there — so there is no loop in which
   * completing a challenge pays points, which unlocks an award, which pays
   * points again.
   */
  private async unlockAchievement(
    activity: CommunityActivity,
    userId: UserId,
    correlationId: CorrelationId,
  ): Promise<void> {
    if (!activity.achievementKey) return;

    try {
      await this.options.awards.grantDirect({
        guildId: activity.guildId,
        userId,
        awardKey: activity.achievementKey,
        evidence: { activity_id: activity.id, kind: activity.kind },
        correlationId,
      });
    } catch (error) {
      // Recognition failing must not cost someone their points.
      this.logger.error(
        'community.achievement_failed',
        'A completion could not unlock its achievement.',
        { error, context: { activity_id: activity.id } },
      );
    }
  }

  /* ---------------------------------------------------------------------- *
   * Output
   * ---------------------------------------------------------------------- */

  /**
   * One public message when an activity is published, and that is all.
   *
   * Posted to #challenges, which is the community-activity channel the server
   * already has. No per-join message, no reminders, no countdown.
   */
  private async announce(activity: CommunityActivity): Promise<void> {
    const channelId = this.options.config.channels.challenges;
    if (!channelId) return;

    try {
      await this.options.messaging.sendToChannel(
        activity.guildId,
        channelId,
        copy.announcement(activity),
      );
    } catch (error) {
      this.logger.warn(
        'community.announce_failed',
        'Could not post the community activity announcement.',
        { error, context: { activity_id: activity.id } },
      );
    }
  }

  /**
   * Completions are confirmed privately, not broadcast.
   *
   * A challenge that announced every completion would post once per member
   * per challenge — the same channel flood the join path avoids. The member
   * is told through the reply to whatever they were doing, and through
   * `/companion challenges`.
   */
  private async announceCompletion(
    activity: CommunityActivity,
    userId: UserId,
  ): Promise<void> {
    if (activity.rewardPoints <= 0 && !activity.achievementKey) return;

    try {
      await this.options.messaging.sendDirectMessage(
        userId,
        copy.completionNotice(activity),
      );
    } catch (error) {
      // A closed DM is a member's choice, not an error worth escalating.
      this.logger.debug('community.dm_failed', 'Could not send a completion notice.', {
        error,
        context: { activity_id: activity.id },
      });
    }
  }

  /**
   * Reject what the database would reject, but with an explanation.
   *
   * The CHECK constraints are the real guarantee; these exist so a staff
   * member gets "the end must be after the start" instead of a constraint
   * name. Anything enforced here is also enforced there.
   */
  private validate(request: CreateActivityRequest): void {
    if (request.endsAt <= request.startsAt) {
      throw bloomError('INVALID_INPUT', {
        operatorHint: 'A community activity must end after it starts.',
      });
    }

    if (request.endsAt <= this.options.now()) {
      throw bloomError('INVALID_INPUT', {
        operatorHint: 'A community activity cannot end in the past.',
      });
    }

    if (
      request.rewardPoints < 0 ||
      request.rewardPoints > ACTIVITY_REWARD_LIMIT ||
      !Number.isInteger(request.rewardPoints)
    ) {
      throw bloomError('INVALID_INPUT', {
        operatorHint: `Reward must be a whole number between 0 and ${String(ACTIVITY_REWARD_LIMIT)}.`,
      });
    }

    if (request.kind === 'challenge') {
      if (!request.targetMetric || !request.targetAmount) {
        throw bloomError('INVALID_INPUT', {
          operatorHint: 'A challenge needs a target metric and a target amount.',
        });
      }
      if (request.capacity != null) {
        throw bloomError('INVALID_INPUT', {
          operatorHint: 'Challenges have no capacity. Only events do.',
        });
      }
    }

    if (request.kind === 'event' && (request.targetMetric || request.targetAmount)) {
      throw bloomError('INVALID_INPUT', {
        operatorHint: 'Events have no target metric. Only challenges do.',
      });
    }
  }
}
