import type { GuildId, CorrelationId, UserId } from '@bloom/shared-types';
import type { PlatformConfig } from '@bloom/config';
import type { MemberAward, Repositories } from '@bloom/database';
import type { MessagingService } from '@bloom/discord';
import type { Logger } from '@bloom/logging';
import { AWARD_DEFINITIONS, awardByKey, type AwardDefinition } from './definitions.js';
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
}

export interface EvaluateRequest {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly correlationId: CorrelationId;
}

export interface AwardProgress {
  readonly definition: AwardDefinition;
  readonly award: MemberAward | null;
}

export class AwardsService {
  private readonly logger: Logger;

  public constructor(private readonly options: AwardsServiceOptions) {
    this.logger = options.logger.child({ context: { feature: 'awards' } });
  }

  /**
   * Grant anything newly earned, and announce it.
   *
   * Returns the definitions granted by *this* call, so the acting command can
   * mention them in its own reply — a member who has just earned something
   * should hear it there, not only in a channel they may not be looking at.
   */
  public async evaluate(request: EvaluateRequest): Promise<readonly AwardDefinition[]> {
    const { awards, rewards } = this.options.repositories;

    const held = await awards.heldKeys(request.guildId, request.userId);
    const pending = AWARD_DEFINITIONS.filter((award) => !held.has(award.key));
    // Nothing left to earn: skip the summary query entirely.
    if (pending.length === 0) return [];

    const summary = await rewards.participation(
      request.guildId,
      request.userId,
      this.options.config.runtime.timezone,
    );

    const granted: AwardDefinition[] = [];

    for (const definition of pending) {
      if (!definition.earned(summary)) continue;

      const outcome = await awards.grant({
        guildId: request.guildId,
        userId: request.userId,
        awardKey: definition.key,
        kind: definition.kind,
        evidence: definition.evidence(summary),
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

      await this.announce(request, definition);
    }

    return granted;
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

    return AWARD_DEFINITIONS.filter((definition) => definition.kind === kind).map(
      (definition) => ({
        definition,
        award: byKey.get(definition.key) ?? null,
      }),
    );
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
