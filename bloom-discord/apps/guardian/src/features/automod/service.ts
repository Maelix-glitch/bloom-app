import {
  AUTOMOD_ENABLED_KEY,
  type AutomodTriggerType,
  type ChannelId,
  type CorrelationId,
  type GuildId,
  type RoleId,
  type UserId,
} from '@bloom/shared-types';
import type { PlatformConfig } from '@bloom/config';
import type {
  AutomodEventRow,
  AutomodPolicyRow,
  CaseRow,
  GuardianRepositories,
} from '@bloom/database';
import type {
  GuildQueryService,
  MessagingService,
  ModerationService,
} from '@bloom/discord';
import type { AutoModerationExecutionPayload } from '@bloom/events';
import type { Logger } from '@bloom/logging';
import { systemClock, type Clock } from '@bloom/utils';
import type { AuthorizationSubject } from '@bloom/permissions';
import { memberNotice, until as untilCopy } from '../moderation/messages.js';
import * as copy from './messages.js';

/**
 * Auto-moderation: Guardian's reaction to Discord's native Auto Moderation.
 *
 * Design note 001 is the spec, and this class is deliberately shaped by its
 * failure table rather than by the happy path:
 *
 *   • **Database down → do not act.** Every escalation decision starts by
 *     recording the event. If the record cannot be written, the method logs
 *     `fatal` and stops: escalation without history is guesswork.
 *   • **Policy missing → alert only.** No thresholds, no punishment, ever.
 *   • **Ceiling: timeout.** There is no code path here to a kick or a ban.
 *     The strongest thing this class can do to a member is time them out,
 *     and a staff member can undo it with one click.
 *   • **Staff are exempt by construction.** Founder, administrator and
 *     moderator role holders are counted but never escalated — checked in
 *     code, not in the policy table, so emptying the exemption list cannot
 *     un-exempt the moderators.
 *   • **The ladder is parallel.** Automod offences count only automod
 *     events. They never feed the warning ladder a human moderator uses,
 *     so a spam wave cannot walk a member toward a ban.
 *
 * The three open questions in the design note, decided:
 *
 *   1. Thresholds are tuned by whoever holds `staff.moderation.execute` —
 *      the same tier that runs `/timeout`. The namespace floor is
 *      moderator-only regardless.
 *   2. Parallel ladder, per above.
 *   3. A reversal notifies the member. "You were timed out and it was a
 *      mistake" is honest, and honesty is the house style.
 */

export interface AutomodServiceOptions {
  readonly config: PlatformConfig;
  readonly repositories: GuardianRepositories;
  readonly guilds: GuildQueryService;
  readonly discord: ModerationService;
  readonly messaging: MessagingService;
  readonly logger: Logger;
  readonly clock?: Clock;
}

/** The note's bound on Discord retries: try twice, then alert a human. */
const TIMEOUT_ATTEMPTS = 2;

export class AutomodService {
  private readonly clock: Clock;

  public constructor(private readonly options: AutomodServiceOptions) {
    this.clock = options.clock ?? systemClock;
  }

  // ---------------------------------------------------------------------------
  // The gateway event
  // ---------------------------------------------------------------------------

  public async handleExecution(
    payload: AutoModerationExecutionPayload,
    correlationId: CorrelationId,
  ): Promise<void> {
    const { repositories, logger } = this.options;
    const guildId = payload.guildId;

    let enabled: boolean;
    try {
      enabled =
        (await repositories.settings.getBotSetting(
          guildId,
          'guardian',
          AUTOMOD_ENABLED_KEY,
        )) === true;
    } catch (error) {
      logger.fatal(
        'automod.settings_unreadable',
        'Could not read the automod switch; taking no action.',
        { context: { guild_id: guildId }, ...(error instanceof Error ? { error } : {}) },
      );
      return;
    }
    if (!enabled) return;

    let event: AutomodEventRow;
    try {
      const recorded = await repositories.automod.recordEvent({
        guildId,
        userId: payload.userId,
        channelId: payload.channelId,
        messageId: payload.messageId,
        ruleId: payload.ruleId,
        triggerType: payload.triggerType,
        matchedKeyword: payload.matchedKeyword,
        discordAction: payload.discordAction,
      });
      if (recorded.duplicate) return;
      event = recorded.event;
    } catch (error) {
      // The note's first failure row. No record, no escalation.
      logger.fatal(
        'automod.record_failed',
        'Could not record an Auto Moderation execution; taking no action.',
        { context: { guild_id: guildId }, ...(error instanceof Error ? { error } : {}) },
      );
      return;
    }

    const snapshot = await this.options.guilds
      .getMember(guildId, payload.userId)
      .catch(() => null);
    if (!snapshot) return; // Departed, or unreadable: counted, nothing more.

    if (this.isStaff(snapshot.roleIds)) return;
    const exempt = await repositories.automod.exemptRoleIds(
      guildId,
      payload.channelId,
      payload.triggerType,
    );
    if (snapshot.roleIds.some((roleId) => exempt.includes(roleId))) return;

    const policy = await repositories.automod.resolveThresholds(
      guildId,
      payload.channelId,
      payload.triggerType,
    );
    if (
      policy?.thresholdCount == null ||
      policy.windowSeconds == null ||
      policy.timeoutSeconds == null
    ) {
      await this.postAlert(event, { kind: 'alert_only' });
      return;
    }

    const windowStart = new Date(this.clock.now() - policy.windowSeconds * 1000);
    const count = await repositories.automod.countEventsInWindow(
      guildId,
      payload.userId,
      payload.triggerType,
      windowStart,
    );
    if (count < policy.thresholdCount) return;

    await this.escalate({
      event,
      thresholdCount: policy.thresholdCount,
      windowSeconds: policy.windowSeconds,
      timeoutSeconds: policy.timeoutSeconds,
      count,
      correlationId,
    });
  }

  // ---------------------------------------------------------------------------
  // Escalation
  // ---------------------------------------------------------------------------

  private async escalate(input: {
    readonly event: AutomodEventRow;
    readonly thresholdCount: number;
    readonly windowSeconds: number;
    readonly timeoutSeconds: number;
    readonly count: number;
    readonly correlationId: CorrelationId;
  }): Promise<void> {
    const { event, count, correlationId } = input;
    const { repositories, logger } = this.options;
    const guildId = event.guildId;

    // The Nth time this member has crossed: the first crossing is step 1.
    const ladderStep = count - input.thresholdCount + 1;

    const caseRow = await this.findOrOpenCase(event, correlationId);

    const [snapshot, self] = await Promise.all([
      this.options.guilds.getMember(guildId, event.userId).catch(() => null),
      this.options.guilds.getSelf(guildId).catch(() => null),
    ]);

    const hierarchyBlocked =
      !snapshot ||
      !self ||
      snapshot.isGuildOwner ||
      snapshot.highestRolePosition >= self.highestRolePosition;

    if (hierarchyBlocked) {
      await repositories.automod.attachOutcome(event.id, {
        ladderStep,
        caseId: caseRow.id,
      });
      await this.caseNote(
        caseRow,
        "Auto-moderation: the threshold was crossed, but the member's role is at or above Guardian's — no timeout was applied. A human decision is needed.",
        correlationId,
      );
      await this.postAlert(
        event,
        { kind: 'hierarchy_blocked', caseNumber: caseRow.caseNumber },
        count,
        input.windowSeconds,
      );
      return;
    }

    if (event.discordAction === 'TIMEOUT') {
      // Discord's own rule already timed them out. Applying a second
      // timeout of our own would double-punish one offence, so the case
      // carries it instead.
      await repositories.automod.attachOutcome(event.id, {
        ladderStep,
        caseId: caseRow.id,
      });
      await this.caseNote(
        caseRow,
        "Auto-moderation: Discord's rule timed the member out directly. Guardian recorded it and did not act twice.",
        correlationId,
      );
      await this.postAlert(
        event,
        { kind: 'discord_timeout', caseNumber: caseRow.caseNumber },
        count,
        input.windowSeconds,
      );
      return;
    }

    const reason = copy.timeoutReason({
      triggerType: event.triggerType,
      count,
      windowSeconds: input.windowSeconds,
    });
    const until = new Date(this.clock.now() + input.timeoutSeconds * 1000);

    // DM before the timeout, as the human path does — best effort, never fatal.
    const guildName = await this.options.guilds
      .getGuildName(guildId)
      .catch(() => 'Bloom');
    await this.options.messaging
      .sendDirectMessage(
        event.userId,
        memberNotice('timeout', guildName, reason, untilCopy(until)),
      )
      .catch(() => false);

    let timedOut = false;
    for (let attempt = 1; attempt <= TIMEOUT_ATTEMPTS; attempt++) {
      try {
        await this.options.discord.timeoutMember({
          guildId,
          userId: event.userId,
          until,
          reason: `[automod] ${reason}`,
        });
        timedOut = true;
        break;
      } catch (error) {
        logger.warn('automod.timeout_attempt_failed', 'A timeout attempt failed.', {
          context: { guild_id: guildId, attempt },
          ...(error instanceof Error ? { error } : {}),
        });
      }
    }

    if (!timedOut) {
      await repositories.automod.attachOutcome(event.id, {
        ladderStep,
        caseId: caseRow.id,
      });
      await this.caseNote(
        caseRow,
        `Auto-moderation: Guardian tried to time the member out and Discord refused ${String(TIMEOUT_ATTEMPTS)} times. The member is not timed out.`,
        correlationId,
      );
      await this.postAlert(
        event,
        { kind: 'timeout_failed', caseNumber: caseRow.caseNumber },
        count,
        input.windowSeconds,
      );
      return;
    }

    const record = await repositories.moderation.record({
      guildId,
      action: 'timeout',
      actorId: null,
      reason,
      subjectId: event.userId,
      channelId: event.channelId,
      caseId: caseRow.id,
      durationSeconds: input.timeoutSeconds,
      expiresAt: until,
      metadata: {
        source: 'automod',
        automod_event_id: event.id,
        trigger_type: event.triggerType,
        matched_keyword: event.matchedKeyword,
        ladder_step: ladderStep,
      },
      correlationId,
    });

    await repositories.audit.append({
      guildId,
      botName: 'guardian',
      event: 'moderation.timeout',
      severity: 'warn',
      actorId: null,
      targetId: event.userId,
      ...(event.channelId ? { channelId: event.channelId } : {}),
      source: 'automod',
      correlationId,
      details: {
        action: 'timeout',
        action_id: record.id,
        case_id: caseRow.id,
        automod_event_id: event.id,
        trigger_type: event.triggerType,
      },
    });

    await this.caseNote(
      caseRow,
      `Automatic timeout — ${reason}`,
      correlationId,
      null,
      'action_recorded',
    );

    await repositories.automod.attachOutcome(event.id, {
      ladderStep,
      moderationActionId: record.id,
      caseId: caseRow.id,
    });

    await this.postAlert(
      event,
      {
        kind: 'timeout',
        timeoutSeconds: input.timeoutSeconds,
        caseNumber: caseRow.caseNumber,
      },
      count,
      input.windowSeconds,
    );

    logger.info('automod.timeout_applied', 'Auto-moderation timed a member out.', {
      context: {
        guild_id: guildId,
        trigger_type: event.triggerType,
        ladder_step: ladderStep,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Staff review (the alert buttons)
  // ---------------------------------------------------------------------------

  public async review(input: {
    readonly eventId: string;
    readonly decision: 'confirmed' | 'reversed' | 'escalated';
    readonly reviewer: AuthorizationSubject;
    readonly correlationId: CorrelationId;
  }): Promise<
    | {
        readonly kind: 'recorded';
        readonly event: AutomodEventRow;
        readonly caseNumber: number | null;
      }
    | { readonly kind: 'already_reviewed'; readonly event: AutomodEventRow }
    | { readonly kind: 'not_found' }
  > {
    const { repositories } = this.options;
    const event = await repositories.automod.findEventById(input.eventId);
    if (!event) return { kind: 'not_found' };
    if (event.reviewStatus !== 'pending') {
      return { kind: 'already_reviewed', event };
    }

    const updated = await repositories.automod.setReview(
      event.id,
      input.decision,
      input.reviewer.userId,
      new Date(this.clock.now()),
    );
    if (!updated) {
      // Lost a race with another reviewer's click. Their decision stands.
      const fresh = await repositories.automod.findEventById(event.id);
      return { kind: 'already_reviewed', event: fresh ?? event };
    }

    let caseNumber: number | null = null;

    if (input.decision === 'reversed' && updated.moderationActionId) {
      await this.reverseTimeout(updated, input.reviewer.userId);
    }

    if (input.decision === 'escalated') {
      caseNumber = await this.escalateCase(updated, input.reviewer, input.correlationId);
    } else if (updated.caseId) {
      const caseRow = await this.findCase(updated);
      caseNumber = caseRow?.caseNumber ?? null;
      if (caseRow) {
        await this.caseNote(
          caseRow,
          input.decision === 'confirmed'
            ? 'Staff review: the automatic action was confirmed.'
            : 'Staff review: the automatic action was reversed.',
          input.correlationId,
          input.reviewer.userId,
        );
      }
    }

    await repositories.audit.append({
      guildId: updated.guildId,
      botName: 'guardian',
      event: `automod.review_${input.decision}`,
      severity: 'info',
      actorId: input.reviewer.userId,
      targetId: updated.userId,
      source: 'automod:review',
      correlationId: input.correlationId,
      details: { automod_event_id: updated.id, trigger_type: updated.triggerType },
    });

    return { kind: 'recorded', event: updated, caseNumber };
  }

  private async reverseTimeout(
    event: AutomodEventRow,
    reviewerId: UserId,
  ): Promise<void> {
    const { repositories, logger } = this.options;

    try {
      await this.options.discord.removeTimeout({
        guildId: event.guildId,
        userId: event.userId,
        reason: `[automod] Reversed on staff review by ${reviewerId}`,
      });
    } catch (error) {
      // The member may have left, or the timeout may already have expired.
      // The record is still reversed below: staff decided the action was
      // wrong, and that fact does not depend on Discord's current state.
      logger.warn('automod.reverse_timeout_failed', 'Could not lift the timeout.', {
        context: { guild_id: event.guildId },
        ...(error instanceof Error ? { error } : {}),
      });
    }

    if (event.moderationActionId) {
      await repositories.moderation.revokeAction({
        id: event.moderationActionId,
        guildId: event.guildId,
        revokedBy: reviewerId,
        reason: 'Automatic action reversed on staff review.',
      });
    }

    const guildName = await this.options.guilds
      .getGuildName(event.guildId)
      .catch(() => 'Bloom');
    await this.options.messaging
      .sendDirectMessage(event.userId, copy.reversalNotice(guildName))
      .catch(() => false);

    logger.info('automod.review_reversed', 'An automatic timeout was reversed.', {
      context: { guild_id: event.guildId, automod_event_id: event.id },
    });
  }

  private async escalateCase(
    event: AutomodEventRow,
    reviewer: AuthorizationSubject,
    correlationId: CorrelationId,
  ): Promise<number | null> {
    const { repositories } = this.options;

    let caseRow = await this.findCase(event);
    if (!caseRow) {
      const opened = await repositories.cases.open({
        guildId: event.guildId,
        origin: 'automation',
        openedBy: null,
        summary: 'Auto-moderation escalation, opened from the alert review.',
        subjectId: event.userId,
        correlationId,
      });
      caseRow = opened.case;
      await repositories.automod.attachCase(event.id, caseRow.id);
    }

    if (caseRow.status !== 'ESCALATED') {
      await repositories.cases.transitionStatus({
        guildId: event.guildId,
        caseNumber: caseRow.caseNumber,
        to: 'ESCALATED',
        actorId: reviewer.userId,
        note: 'Escalated from the auto-moderation alert.',
        correlationId,
      });
    }
    return caseRow.caseNumber;
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  public async status(guildId: GuildId): Promise<{
    readonly enabled: boolean;
    readonly policies: readonly AutomodPolicyRow[];
    readonly volume24h: ReadonlyMap<AutomodTriggerType, number>;
    readonly volume7d: ReadonlyMap<AutomodTriggerType, number>;
  }> {
    const { repositories } = this.options;
    const now = this.clock.now();
    const [enabledValue, policies, volume24h, volume7d] = await Promise.all([
      repositories.settings.getBotSetting(guildId, 'guardian', AUTOMOD_ENABLED_KEY),
      repositories.automod.listPolicies(guildId),
      repositories.automod.countByTriggerSince(guildId, new Date(now - 24 * 3600 * 1000)),
      repositories.automod.countByTriggerSince(
        guildId,
        new Date(now - 7 * 24 * 3600 * 1000),
      ),
    ]);
    return { enabled: enabledValue === true, policies, volume24h, volume7d };
  }

  public async setThreshold(input: {
    readonly guildId: GuildId;
    readonly triggerType: AutomodTriggerType | null;
    readonly channelId: ChannelId | null;
    readonly thresholdCount: number;
    readonly windowSeconds: number;
    readonly timeoutSeconds: number;
    readonly updatedBy: UserId;
  }): Promise<AutomodPolicyRow> {
    return await this.options.repositories.automod.upsertPolicy({
      guildId: input.guildId,
      triggerType: input.triggerType,
      channelId: input.channelId,
      thresholdCount: input.thresholdCount,
      windowSeconds: input.windowSeconds,
      timeoutSeconds: input.timeoutSeconds,
      updatedBy: input.updatedBy,
    });
  }

  public async addExemptRole(input: {
    readonly guildId: GuildId;
    readonly roleId: RoleId;
    readonly updatedBy: UserId;
  }): Promise<{ readonly added: boolean }> {
    const { repositories } = this.options;
    // Read the guild-default row's own list, not the scope union: writing a
    // union back would silently widen a channel-scoped exemption to the
    // whole guild.
    const policies = await repositories.automod.listPolicies(input.guildId);
    const defaultRow = policies.find(
      (row) => row.channelId === null && row.triggerType === null,
    );
    const own = defaultRow?.exemptRoleIds ?? [];
    if (own.includes(input.roleId)) return { added: false };

    await repositories.automod.upsertPolicy({
      guildId: input.guildId,
      exemptRoleIds: [...own, input.roleId],
      updatedBy: input.updatedBy,
    });
    return { added: true };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private isStaff(roleIds: readonly RoleId[]): boolean {
    const roles = this.options.config.roles;
    const staffRoleIds = [roles.founder, roles.administrator, roles.moderator].filter(
      (id): id is RoleId => id !== null,
    );
    return roleIds.some((roleId) => staffRoleIds.includes(roleId));
  }

  private async findOrOpenCase(
    event: AutomodEventRow,
    correlationId: CorrelationId,
  ): Promise<CaseRow> {
    const existing = await this.findCase(event);
    if (existing) return existing;

    const { case: opened } = await this.options.repositories.cases.open({
      guildId: event.guildId,
      origin: 'automation',
      openedBy: null,
      summary: 'Auto-moderation — one member triggered a rule repeatedly.',
      subjectId: event.userId,
      correlationId,
    });

    await this.options.repositories.audit.append({
      guildId: event.guildId,
      botName: 'guardian',
      event: 'moderation.case_opened',
      severity: 'info',
      actorId: null,
      targetId: event.userId,
      source: 'automod',
      correlationId,
      details: { case_number: opened.caseNumber, automod_event_id: event.id },
    });

    return opened;
  }

  /**
   * The member's still-active automation case, if there is one.
   *
   * One open case per member for automod: a flood is one incident, and six
   * cases for six messages would bury the queue the case system exists to
   * keep readable. A closed case is never reused — the next incident gets
   * a fresh file, with the history one lookup away.
   */
  private async findCase(event: AutomodEventRow): Promise<CaseRow | null> {
    const cases = await this.options.repositories.cases.list(event.guildId, {
      subjectId: event.userId,
      limit: 25,
    });
    return (
      cases.find(
        (row) =>
          row.origin === 'automation' &&
          (event.caseId === null || row.id === event.caseId),
      ) ?? null
    );
  }

  private async caseNote(
    caseRow: CaseRow,
    body: string,
    correlationId: CorrelationId,
    actorId?: UserId | null,
    eventType: 'note' | 'action_recorded' = 'note',
  ): Promise<void> {
    await this.options.repositories.cases.appendEvent({
      caseId: caseRow.id,
      eventType,
      actorId: actorId ?? null,
      body,
      correlationId,
    });
  }

  private async postAlert(
    event: AutomodEventRow,
    outcome: copy.AutomodAlertOutcome,
    windowCount?: number,
    windowSeconds?: number,
  ): Promise<void> {
    const channelId = this.options.config.channels.moderation;
    if (!channelId) {
      this.options.logger.warn(
        'automod.alert_channel_unconfigured',
        'No moderation channel is configured; the alert was not posted.',
        { context: { guild_id: event.guildId } },
      );
      return;
    }
    try {
      const messageId = await this.options.messaging.sendToChannel(
        event.guildId,
        channelId,
        copy.alertMessage({
          event,
          outcome,
          ...(windowCount !== undefined ? { windowCount } : {}),
          ...(windowSeconds !== undefined ? { windowSeconds } : {}),
        }),
      );
      await this.options.repositories.automod.attachAlertMessage(event.id, messageId);
    } catch (error) {
      // The action (if any) already happened and is recorded. A failed
      // alert must never turn a handled event into a crashed handler.
      this.options.logger.error(
        'automod.alert_failed',
        'Could not post the auto-moderation alert.',
        {
          context: { guild_id: event.guildId, automod_event_id: event.id },
          ...(error instanceof Error ? { error } : {}),
        },
      );
    }
  }
}
