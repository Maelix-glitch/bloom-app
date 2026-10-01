import type { GuildId, CorrelationId, UserId } from '@bloom/shared-types';
import type { PlatformConfig } from '@bloom/config';
import type { MemberAward, Repositories } from '@bloom/database';
import type { MessagingService } from '@bloom/discord';
import type { Logger } from '@bloom/logging';
import {
  AWARD_DEFINITIONS,
  awardByKey,
  type AwardContext,
  type AwardDefinition,
  type AwardMeasure,
} from './definitions.js';
import type { RewardsService } from '../rewards/service.js';
import * as copy from './messages.js';

/**
 * Milestones and achievements.
 *
 * Evaluation is pull-based: after an action that could have changed something,
 * the whole definition list is re-checked against freshly computed counts. No
 * incremental counters, no "on the 50th check-in, grant this" special case in
 * the check-in path.
 *
 * That costs one query per check-in and buys three things. A definition can be
 * added, retuned or removed without a backfill — the next evaluation simply
 * grants it. A member who was owed something during an outage gets it on their
 * next action. And a milestone can never be granted on a number nothing can
 * reproduce, because the number is computed from the records at the moment it
 * is used.
 */

export interface AwardsServiceOptions {
  readonly config: PlatformConfig;
  readonly repositories: Repositories;
  readonly messaging: MessagingService;
  readonly logger: Logger;
  /**
   * Pays an award that carries points.
   *
   * The real `RewardsService`, narrowed to the one operation, so this service
   * cannot reach the ledger by any other route. No definition sets `points`
   * in V1, so in production this is never called — it is injected anyway so
   * the payment path is exercised by tests rather than assumed to work.
   *
   * Optional because the awards surface predates it and a caller with no
   * paying definitions needs nothing.
   */
  readonly rewards?: Pick<RewardsService, 'awardAchievement'>;
  /**
   * The definitions to evaluate. Defaults to the real list.
   *
   * Injectable so a test can introduce a point-bearing definition without
   * adding one to the shipped set, which is the only way to prove the reward
   * path while keeping the "no award grants points" rule true of production.
   */
  readonly definitions?: readonly AwardDefinition[];
}

export interface EvaluateRequest {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly correlationId: CorrelationId;
}

export interface AwardProgress {
  readonly definition: AwardDefinition;
  readonly award: MemberAward | null;
  /**
   * How far along an unearned, countable award is.
   *
   * Null for one of three honest reasons: the award is already held, the
   * criterion is not a count, or the source was not loaded. All three mean
   * "do not draw a fraction", which is the only thing the caller needs.
   */
  readonly measure: AwardMeasure | null;
}

export class AwardsService {
  private readonly logger: Logger;
  private readonly definitions: readonly AwardDefinition[];

  public constructor(private readonly options: AwardsServiceOptions) {
    this.logger = options.logger.child({ context: { feature: 'awards' } });
    this.definitions = options.definitions ?? AWARD_DEFINITIONS;
  }

  /**
   * Grant anything newly earned, and announce it.
   *
   * Returns the definitions granted by *this* call, so the acting command can
   * mention them in its own reply — a member who has just earned something
   * should hear it there, not only in a channel they may not be looking at.
   */
  public async evaluate(request: EvaluateRequest): Promise<readonly AwardDefinition[]> {
    const { awards } = this.options.repositories;

    const held = await awards.heldKeys(request.guildId, request.userId);
    const pending = this.definitions.filter((award) => !held.has(award.key));
    // Nothing left to earn: skip the summary query entirely.
    if (pending.length === 0) return [];

    const context = await this.loadContext(request, pending);

    const granted: AwardDefinition[] = [];

    for (const definition of pending) {
      if (!definition.earned(context)) continue;

      const outcome = await awards.grant({
        guildId: request.guildId,
        userId: request.userId,
        awardKey: definition.key,
        kind: definition.kind,
        evidence: definition.evidence(context),
      });

      /*
       * `already_held` means another evaluation won the race — a check-in and a
       * shared win a second apart, or two replicas. The primary key decided,
       * and the loser must not announce. This is why the grant returns an
       * outcome rather than void.
       */
      if (outcome.kind !== 'granted') continue;

      granted.push(definition);

      await this.options.repositories.audit.append({
        guildId: request.guildId,
        botName: 'companion',
        event: 'awards.granted',
        actorId: null,
        targetId: request.userId,
        severity: 'info',
        source: 'awards',
        correlationId: request.correlationId,
        details: { award: definition.key, kind: definition.kind },
      });

      await this.payReward(request, definition);
      await this.announce(request, definition);
    }

    return granted;
  }

  /**
   * Load exactly the records the pending definitions need.
   *
   * Participation is always read — almost every definition uses it and the
   * caller has just done something that changes it. The referral count is
   * read only when a pending definition declares that source, so a member who
   * already holds both referral awards costs nothing extra on every check-in.
   *
   * A source that was not loaded stays `null`, and criteria are written to
   * refuse on null rather than treat it as zero.
   */
  private async loadContext(
    request: { readonly guildId: GuildId; readonly userId: UserId },
    pending: readonly AwardDefinition[],
  ): Promise<AwardContext> {
    const { rewards, referrals } = this.options.repositories;

    const participation = await rewards.participation(
      request.guildId,
      request.userId,
      this.options.config.runtime.timezone,
    );

    const needsReferrals = pending.some((award) => award.source === 'referrals');
    const qualifiedReferrals = needsReferrals
      ? await referrals.countPaidForInviter(request.guildId, request.userId)
      : null;

    return { participation, qualifiedReferrals };
  }

  /**
   * Pay an award that carries points.
   *
   * Dead in production — no shipped definition sets `points` — and fully
   * wired anyway, because the alternative is discovering on the day someone
   * sets the field that the path was never right.
   *
   * ## Why this is safe without a shared transaction
   *
   * The grant and the ledger write are two statements against two
   * repositories, and there is no transaction spanning them. That is survived
   * rather than pretended away, by making each half idempotent and ordering
   * them so the recoverable failure is the one that happens:
   *
   *   • The grant goes first and is arbitrated by the primary key, so only
   *     one evaluation ever reaches this method for a given award.
   *   • The payment uses an idempotency key derived from the award itself —
   *     `achievement:{guild}:{user}:{key}` — so a retry after a crash between
   *     the two writes is absorbed by the ledger's unique index and returns
   *     `duplicate` instead of paying twice.
   *
   * The failure that remains is a grant whose payment never happened: the
   * member holds the award and was not paid. That is visible (the award has
   * no matching ledger row), correctable by re-running the payment with the
   * same key, and strictly better than the inverse, which would be paying
   * someone twice for one achievement.
   */
  private async payReward(
    request: EvaluateRequest,
    definition: AwardDefinition,
  ): Promise<void> {
    const points = definition.points ?? 0;
    if (points <= 0) return;

    if (!this.options.rewards) {
      /*
       * A definition asks for points and nothing can pay it. Loud, because
       * silently granting an unpaid award is the exact dishonesty the brief
       * forbids — the member would be told they earned something they did
       * not receive.
       */
      this.logger.error(
        'awards.reward_unavailable',
        'An award carries points but no rewards service is wired, so it was granted unpaid.',
        { context: { award: definition.key, points } },
      );
      return;
    }

    try {
      await this.options.rewards.awardAchievement({
        guildId: request.guildId,
        userId: request.userId,
        awardKey: definition.key,
        points,
        correlationId: request.correlationId,
      });
    } catch (error) {
      /*
       * Not rethrown. The award is earned and recorded; a ledger failure must
       * not unwind that or stop the remaining definitions being evaluated.
       * The idempotency key makes a later retry safe.
       */
      this.logger.error(
        'awards.reward_failed',
        'An award was granted but its points could not be paid.',
        { error, context: { award: definition.key, points } },
      );
    }
  }

  /**
   * Everything a member holds, and everything they do not, in definition order.
   *
   * Unearned awards are included rather than hidden. A list that only showed
   * what you have cannot answer "what else is there?", and a recognition system
   * whose contents are a secret is a slot machine.
   */
  public async progress(
    guildId: GuildId,
    userId: UserId,
    kind: 'milestone' | 'achievement',
  ): Promise<readonly AwardProgress[]> {
    const held = await this.options.repositories.awards.list(guildId, userId);
    const byKey = new Map(held.map((award) => [award.awardKey, award]));
    const definitions = this.definitions.filter((definition) => definition.kind === kind);

    /*
     * Measuring costs a query, so it is only paid for when it can change what
     * is shown: if every definition of this kind is already held there is no
     * fraction left to draw, and the read is skipped.
     */
    const unearned = definitions.filter((definition) => !byKey.has(definition.key));
    const context =
      unearned.length === 0
        ? null
        : await this.loadContext({ guildId, userId }, unearned);

    return definitions.map((definition) => {
      const award = byKey.get(definition.key) ?? null;
      return {
        definition,
        award,
        measure:
          award !== null || context === null
            ? null
            : (definition.measure?.(context) ?? null),
      };
    });
  }

  /** Awards a member holds, newest first, for the profile summary. */
  public async recent(
    guildId: GuildId,
    userId: UserId,
    limit = 3,
  ): Promise<readonly AwardDefinition[]> {
    const held = await this.options.repositories.awards.list(guildId, userId);
    return held
      .slice(0, limit)
      .map((award) => awardByKey(award.awardKey))
      .filter((definition): definition is AwardDefinition => definition !== undefined);
  }

  private async announce(
    request: EvaluateRequest,
    definition: AwardDefinition,
  ): Promise<void> {
    const channel =
      definition.kind === 'milestone'
        ? this.options.config.channels.milestones
        : this.options.config.channels.achievements;

    if (!channel) {
      // Not an error. The award is earned; the server simply has nowhere to
      // say so, and the member still sees it in their own reply.
      await this.options.repositories.awards.markAnnounced(
        request.guildId,
        request.userId,
        definition.key,
      );
      return;
    }

    try {
      await this.options.messaging.sendToChannel(
        request.guildId,
        channel,
        copy.awardAnnouncement(definition, request.userId),
      );
      await this.options.repositories.awards.markAnnounced(
        request.guildId,
        request.userId,
        definition.key,
      );
    } catch (error) {
      /*
       * Left unannounced on purpose, and not retried here. The award is
       * granted either way; the flag records that the server has not been told,
       * so a future sweep can post it without re-granting anything.
       */
      this.logger.warn('awards.announce_failed', 'Could not announce an award.', {
        error,
        context: { award: definition.key },
      });
    }
  }
}
