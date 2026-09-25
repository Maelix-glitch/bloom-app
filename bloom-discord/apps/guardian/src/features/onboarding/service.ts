import {
  bloomError,
  BloomError,
  ONBOARDING_STATE_ROLE,
  type CorrelationId,
  type GuildId,
  type OnboardingState,
  type OnboardingTrigger,
  type RoleId,
  type UserId,
} from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { PlatformConfig } from '@bloom/config';
import type { MemberRecord, Repositories } from '@bloom/database';
import type { GuildQueryService, MessagingService, RoleService } from '@bloom/discord';
import { idempotencyKey, systemClock, type Clock } from '@bloom/utils';
import * as copy from './messages.js';

/**
 * The onboarding lifecycle.
 *
 * This is the only place in the platform that moves a member between lifecycle
 * states, and the only place that grants ✧ Early Bloom or ❋ Bloom Member. It
 * depends on `RoleService` and `MessagingService` — ports, not discord.js — so
 * the whole of it is testable against the in-memory guild in `@bloom/testing`.
 *
 * ## Ordering, and why it is what it is
 *
 * Every transition does the database write **first** and the Discord role write
 * **second**. Neither order is free of failure modes, so the question is which
 * inconsistency is recoverable:
 *
 *   • DB first, Discord fails → the member is recorded as verified but lacks
 *     the role. Visible, detectable by reconciliation, fixable by re-running.
 *     The member is told plainly that the role did not apply.
 *   • Discord first, DB fails → the member holds the role with no record of why
 *     or when. That is an unaudited privilege grant, and the brief's rule is
 *     that we never fake verification. It is also invisible: nothing downstream
 *     knows to look.
 *
 * So the audit trail leads. A missing role is an operational problem; a missing
 * record is an integrity problem.
 */

export interface OnboardingServiceOptions {
  readonly config: PlatformConfig;
  readonly repositories: Repositories;
  readonly roles: RoleService;
  readonly messaging: MessagingService;
  readonly guilds: GuildQueryService;
  readonly logger: Logger;
  readonly clock?: Clock;
}

export interface VerifyRequest {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly correlationId: CorrelationId;
}

export type VerifyResult =
  | { readonly kind: 'verified'; readonly roleApplied: boolean }
  | { readonly kind: 'already'; readonly state: OnboardingState }
  | { readonly kind: 'revoked' };

export interface CompleteRequest {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly actorId: UserId;
  readonly correlationId: CorrelationId;
}

export interface JoinRequest {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly username: string;
  readonly isBot: boolean;
  readonly joinedAt: Date | null;
  readonly correlationId: CorrelationId;
}

export class OnboardingService {
  private readonly clock: Clock;
  private readonly logger: Logger;

  public constructor(private readonly options: OnboardingServiceOptions) {
    this.clock = options.clock ?? systemClock;
    this.logger = options.logger.child({ context: { feature: 'onboarding' } });
  }

  /**
   * A member verifying themselves.
   *
   * `unverified → early_bloom`. The only self-service transition in the
   * platform; everything else requires staff.
   */
  public async verify(request: VerifyRequest): Promise<VerifyResult> {
    const member = await this.requireMember(request.guildId, request.userId, {
      backfill: true,
    });

    if (member.onboardingState === 'revoked') {
      await this.recordAttempt(request, 'UNAUTHORIZED');
      return { kind: 'revoked' };
    }

    if (member.onboardingState !== 'unverified') {
      await this.recordAttempt(request, 'DUPLICATE_OPERATION');
      return { kind: 'already', state: member.onboardingState };
    }

    /*
     * Idempotency across processes.
     *
     * Discord will deliver the same interaction twice under retry, and a member
     * can double-click faster than the first request completes. The database
     * arbitrates: the loser is told the work is already done rather than
     * performing a second role grant and writing a second audit row.
     */
    const key = idempotencyKey('onboarding.verify', request.guildId, request.userId);
    const claim = await this.options.repositories.idempotency.claim(key, {
      botName: 'guardian',
      operation: 'onboarding.verify',
      guildId: request.guildId,
      correlationId: request.correlationId,
    });

    if (!claim.claimed) {
      await this.recordAttempt(request, 'DUPLICATE_OPERATION');
      return { kind: 'already', state: 'early_bloom' };
    }

    const outcome = await this.options.repositories.onboarding.transition({
      guildId: request.guildId,
      userId: request.userId,
      expectedFrom: 'unverified',
      to: 'early_bloom',
      trigger: 'self_verify',
      actorId: request.userId,
      reason: 'Verified via /verify',
      source: 'command:/verify',
      correlationId: request.correlationId,
    });

    if (outcome.kind !== 'applied') {
      // Someone or something moved them between the read and the write.
      await this.recordAttempt(request, 'DUPLICATE_OPERATION');
      return {
        kind: 'already',
        state: outcome.kind === 'conflict' ? outcome.actual : 'early_bloom',
      };
    }

    const roleApplied = await this.applyStateRole(
      request.guildId,
      request.userId,
      'early_bloom',
      'Verified via /verify',
    );

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'guardian',
      event: 'onboarding.verified',
      actorId: request.userId,
      targetId: request.userId,
      source: 'command:/verify',
      correlationId: request.correlationId,
      details: { role_applied: roleApplied },
    });

    await this.recordAttempt(request, 'granted');
    await this.options.repositories.idempotency.recordResult(key, {
      state: 'early_bloom',
      role_applied: roleApplied,
    });

    return { kind: 'verified', roleApplied };
  }

  /**
   * Staff moving a member from onboarding to full membership.
   *
   * `early_bloom → bloom_member`. Swaps the role as well as the state: a member
   * should hold exactly one lifecycle role, and leaving ✧ Early Bloom attached
   * would make the role list meaningless as a signal.
   */
  public async completeOnboarding(request: CompleteRequest): Promise<void> {
    const member = await this.requireMember(request.guildId, request.userId);

    if (member.onboardingState === 'bloom_member') {
      throw bloomError('DUPLICATE_OPERATION', {
        operatorHint: 'That member already holds ❋ Bloom Member.',
        userMessage: 'That member has already completed onboarding.',
      });
    }

    if (member.onboardingState !== 'early_bloom') {
      throw bloomError('INVALID_INPUT', {
        operatorHint: `Member is "${member.onboardingState}"; only a member in "early_bloom" can complete onboarding.`,
        userMessage:
          'That member has not been verified yet, so they cannot complete onboarding.',
        details: { state: member.onboardingState },
      });
    }

    const outcome = await this.options.repositories.onboarding.transition({
      guildId: request.guildId,
      userId: request.userId,
      expectedFrom: 'early_bloom',
      to: 'bloom_member',
      trigger: 'staff_action',
      actorId: request.actorId,
      reason: 'Onboarding completed',
      source: 'command:/guardian onboarding complete',
      correlationId: request.correlationId,
    });

    if (outcome.kind !== 'applied') {
      throw bloomError('DUPLICATE_OPERATION', {
        operatorHint: `Transition did not apply: ${outcome.kind}.`,
        userMessage: 'That member’s status changed while this ran. Check it and retry.',
      });
    }

    // Grant before revoking. If the second call fails the member is left with
    // both roles, which is untidy; the other order leaves them with none, which
    // removes access they had a moment ago.
    await this.applyStateRole(
      request.guildId,
      request.userId,
      'bloom_member',
      'Onboarding completed',
    );
    await this.removeRoleKey(
      request.guildId,
      request.userId,
      'earlyBloom',
      'Onboarding completed',
    );

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'guardian',
      event: 'onboarding.completed',
      actorId: request.actorId,
      targetId: request.userId,
      source: 'command:/guardian onboarding complete',
      correlationId: request.correlationId,
    });
  }

  /**
   * A member joining the guild.
   *
   * Creates the records and posts the prompt. It does **not** grant any role:
   * joining is not verifying, and a join-time grant would be exactly the "fake
   * verification" the brief forbids.
   */
  public async handleJoin(request: JoinRequest): Promise<void> {
    if (request.isBot) {
      this.logger.debug('onboarding.join_ignored', 'Ignoring a bot joining.');
      return;
    }

    const member = await this.options.repositories.identity.ensureMember({
      guildId: request.guildId,
      userId: request.userId,
      username: request.username,
      joinedAt: request.joinedAt,
    });

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'guardian',
      event: 'member.joined',
      targetId: request.userId,
      source: 'gateway:guildMemberAdd',
      correlationId: request.correlationId,
      details: {
        // A returning member is a materially different event from a new one,
        // and the state they return in is the reason why.
        returning: member.onboardingState !== 'unverified',
        state: member.onboardingState,
      },
    });

    /*
     * A returning member who is already verified gets no prompt.
     *
     * Telling someone who completed onboarding months ago to "run /verify" is
     * both wrong and slightly insulting. Their state survived the departure on
     * purpose.
     */
    if (member.onboardingState !== 'unverified') {
      this.logger.info(
        'onboarding.rejoin',
        `Returning member is already "${member.onboardingState}"; no prompt sent.`,
        { context: { user_id: request.userId, state: member.onboardingState } },
      );
      return;
    }

    const channelId = this.options.config.channels.welcome;
    if (!channelId) {
      // Not an error. A server without a welcome channel configured simply does
      // not get the prompt, and says so once per join rather than failing.
      this.logger.warn(
        'onboarding.no_welcome_channel',
        'CHANNEL_WELCOME is not configured, so no verification prompt was posted. Set it to the channel new members land in.',
      );
      return;
    }

    await this.options.messaging.sendToChannel(
      request.guildId,
      channelId,
      copy.joinNotice(request.userId),
    );
  }

  /** A member leaving. Records the departure; keeps everything else. */
  public async handleLeave(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly leftAt: Date;
    readonly correlationId: CorrelationId;
  }): Promise<void> {
    const member = await this.options.repositories.identity.findMember(
      input.guildId,
      input.userId,
    );

    // Someone we never recorded — a bot, or a join from before the platform was
    // deployed. Nothing to mark.
    if (!member) return;

    await this.options.repositories.identity.markLeft(
      input.guildId,
      input.userId,
      input.leftAt,
    );

    await this.options.repositories.audit.append({
      guildId: input.guildId,
      botName: 'guardian',
      event: 'member.left',
      targetId: input.userId,
      source: 'gateway:guildMemberRemove',
      correlationId: input.correlationId,
      details: { state_at_departure: member.onboardingState },
    });
  }

  public async status(guildId: GuildId, userId: UserId): Promise<MemberRecord | null> {
    return await this.options.repositories.identity.findMember(guildId, userId);
  }

  public async overview(
    guildId: GuildId,
  ): Promise<Readonly<Record<OnboardingState, number>>> {
    return await this.options.repositories.onboarding.countByState(guildId);
  }

  // ---------------------------------------------------------------------------

  private async requireMember(
    guildId: GuildId,
    userId: UserId,
    createWith?: { readonly backfill: true },
  ): Promise<MemberRecord> {
    const existing = await this.options.repositories.identity.findMember(guildId, userId);
    if (existing) return existing;

    /*
     * No record, but they are clearly here — they just ran a command.
     *
     * This happens whenever Guardian was offline during their join, which is a
     * completely ordinary occurrence during a deploy. Creating the row on
     * demand is better than refusing to verify someone who is standing there.
     */
    if (createWith) {
      this.logger.info(
        'onboarding.backfill',
        'No membership record existed; creating one now. Guardian was probably offline when this member joined.',
        { context: { user_id: userId } },
      );
      // The username comes from Discord rather than from the interaction: an
      // authorization subject deliberately carries no display data.
      const snapshot = await this.options.guilds.getMember(guildId, userId);
      return await this.options.repositories.identity.ensureMember({
        guildId,
        userId,
        username: snapshot?.username ?? userId,
        joinedAt: snapshot?.joinedAt ?? this.clock.date(),
      });
    }

    throw bloomError('MEMBER_NOT_FOUND', {
      operatorHint: `No membership record for ${userId} in ${guildId}.`,
      userMessage: 'That member is not in this server.',
    });
  }

  /**
   * Grant the role that belongs to a lifecycle state.
   *
   * Returns whether the grant landed rather than throwing, because the state
   * change has already been committed by this point. A hierarchy failure here
   * is an admin problem to fix, not a reason to tell a verified member that
   * verification failed — they *are* verified, the role just did not apply yet.
   */
  private async applyStateRole(
    guildId: GuildId,
    userId: UserId,
    state: OnboardingState,
    reason: string,
  ): Promise<boolean> {
    const roleKey = ONBOARDING_STATE_ROLE[state];
    if (!roleKey) return true;

    const roleId = this.options.config.roles[roleKey];
    if (!roleId) {
      this.logger.error(
        'onboarding.role_unconfigured',
        `No role id is configured for "${roleKey}", so the member's state changed but no role was granted. Set the matching environment variable.`,
        { context: { role_key: roleKey, state } },
      );
      return false;
    }

    try {
      await this.options.roles.assignRole({ guildId, userId, roleId, reason });
      return true;
    } catch (error) {
      const bloom = BloomError.from(error);
      this.logger.log(
        bloom.severity,
        'onboarding.role_failed',
        `State is recorded as "${state}" but the role could not be applied. The member is verified in the database and will be reconciled once the cause is fixed.`,
        { error: bloom, error_code: bloom.code, context: { role_id: roleId } },
      );
      return false;
    }
  }

  private async removeRoleKey(
    guildId: GuildId,
    userId: UserId,
    roleKey: 'earlyBloom' | 'bloomMember',
    reason: string,
  ): Promise<void> {
    const roleId: RoleId | null = this.options.config.roles[roleKey];
    if (!roleId) return;

    try {
      await this.options.roles.removeRole({ guildId, userId, roleId, reason });
    } catch (error) {
      const bloom = BloomError.from(error);
      this.logger.log(
        bloom.severity,
        'onboarding.role_remove_failed',
        `Could not remove the previous lifecycle role; the member now holds two. Remove "${roleKey}" by hand or re-run once the cause is fixed.`,
        { error: bloom, error_code: bloom.code, context: { role_id: roleId } },
      );
    }
  }

  /** Attempt logging must never be the reason a verification fails. */
  private async recordAttempt(request: VerifyRequest, outcome: string): Promise<void> {
    try {
      await this.options.repositories.onboarding.recordVerificationAttempt({
        guildId: request.guildId,
        userId: request.userId,
        outcome,
        correlationId: request.correlationId,
      });
    } catch (error) {
      this.logger.warn(
        'onboarding.attempt_log_failed',
        'Could not record the verification attempt.',
        { error },
      );
    }
  }
}

/** Re-exported so handlers and commands can build messages without importing copy twice. */
export { copy as onboardingCopy };

export type { OnboardingTrigger };
