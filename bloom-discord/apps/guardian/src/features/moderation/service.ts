import {
  bloomError,
  BloomError,
  MODERATION_ACTION_LABELS,
  type ChannelId,
  type CorrelationId,
  type GuildId,
  type JsonValue,
  type ModerationAction,
  type UserId,
} from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { PlatformConfig } from '@bloom/config';
import type { ModerationActionRow, Repositories } from '@bloom/database';
import type {
  ChannelModerationService,
  ChannelSendPermission,
  GuildQueryService,
  MemberSnapshot,
  MessagingService,
  ModerationService as DiscordModeration,
  PurgeResult,
} from '@bloom/discord';
import {
  checkModerationTarget,
  type AuthorizationSubject,
  type AuthorizationTarget,
  type BotRoleContext,
} from '@bloom/permissions';
import { sanitiseUserText, systemClock, type Clock } from '@bloom/utils';
import * as copy from './messages.js';

/**
 * Moderation actions.
 *
 * ## Ordering
 *
 * The opposite of onboarding, deliberately.
 *
 * Onboarding writes the database first, because a member recorded as verified
 * but missing a role is recoverable while an unaudited role grant is not.
 * Moderation writes Discord first, because the failure modes invert:
 *
 *   • Discord first, database fails → the member is genuinely timed out and the
 *     log is missing a row. Bad, logged loudly, and the *member is not harmed*.
 *   • Database first, Discord fails → the record says a member was banned when
 *     they are still in the server. Staff read the record and believe the
 *     problem is handled. Nobody notices until it happens again.
 *
 * A moderation log that overstates what happened is worse than one that lags,
 * so the effect lands before the record claims it did. `warn` and `note` have
 * no Discord side at all and are simply written.
 *
 * ## Authorization
 *
 * Whether the moderator may run the command is settled by the command policy.
 * Whether they may use it on *this* target is settled by
 * `checkModerationTarget`, called here rather than in the command handlers so
 * that every path — including any future one — passes through it.
 */

export interface ModerationServiceOptions {
  readonly config: PlatformConfig;
  readonly repositories: Repositories;
  readonly guilds: GuildQueryService;
  readonly discord: DiscordModeration;
  readonly channels: ChannelModerationService;
  readonly messaging: MessagingService;
  readonly logger: Logger;
  readonly clock?: Clock;
}

export interface MemberActionRequest {
  readonly guildId: GuildId;
  readonly actor: AuthorizationSubject;
  readonly targetId: UserId;
  readonly reason: string;
  readonly correlationId: CorrelationId;
  /** Attach to an existing case. */
  readonly caseNumber?: number | null;
}

export interface TimeoutRequest extends MemberActionRequest {
  readonly durationMs: number;
}

export interface BanRequest extends MemberActionRequest {
  readonly deleteMessageSeconds?: number;
}

export interface ActionOutcome {
  readonly action: ModerationAction;
  readonly record: ModerationActionRow;
  /** Whether the member was told. DMs are frequently closed; that is not a failure. */
  readonly memberNotified: boolean;
  /** Active warnings after the action, when relevant. */
  readonly activeWarnings?: number;
}

export class ModerationActionService {
  private readonly clock: Clock;

  public constructor(private readonly options: ModerationServiceOptions) {
    this.clock = options.clock ?? systemClock;
  }

  // ---------------------------------------------------------------------------
  // Shared preflight
  // ---------------------------------------------------------------------------

  /**
   * Resolve the target and decide whether this actor may act on them.
   *
   * Returns the member snapshot when they are present, or `null` when they are
   * not and the action tolerates that (`ban`, `unban`).
   */
  private async authorise(
    action: ModerationAction,
    guildId: GuildId,
    actor: AuthorizationSubject,
    targetId: UserId,
  ): Promise<MemberSnapshot | null> {
    const [snapshot, self] = await Promise.all([
      this.options.guilds.getMember(guildId, targetId),
      this.options.guilds.getSelf(guildId),
    ]);

    const target: AuthorizationTarget | null = snapshot
      ? {
          userId: snapshot.userId,
          roleIds: snapshot.roleIds,
          highestRolePosition: snapshot.highestRolePosition,
          isGuildOwner: snapshot.isGuildOwner,
        }
      : null;

    const bot: BotRoleContext = {
      highestRolePosition: self.highestRolePosition,
      highestRoleName: self.highestRoleName,
      permissions: self.permissions,
    };

    const decision = checkModerationTarget({
      action,
      actor,
      target,
      targetUserId: targetId,
      bot,
      botUserId: self.userId,
      config: this.options.config,
    });

    if (!decision.ok) throw decision.error;
    return snapshot;
  }

  /**
   * Resolve a case number to a case id, if one was supplied.
   *
   * A bad case number is refused rather than silently ignored: an action
   * attached to the wrong case, or to no case when the moderator believed
   * otherwise, is a record that misleads.
   */
  private async resolveCaseId(
    guildId: GuildId,
    caseNumber: number | null | undefined,
  ): Promise<string | null> {
    if (caseNumber === null || caseNumber === undefined) return null;

    const found = await this.options.repositories.cases.findByNumber(guildId, caseNumber);
    if (!found) {
      throw bloomError('INVALID_INPUT', {
        userMessage: `Case #${String(caseNumber)} does not exist.`,
        details: { case_number: caseNumber },
      });
    }
    return found.id;
  }

  /**
   * Record the action, audit it, and link it to a case.
   *
   * One place, so no action can be performed without being recorded — the
   * property the whole feature exists to provide.
   */
  private async record(input: {
    readonly action: ModerationAction;
    readonly guildId: GuildId;
    readonly actor: AuthorizationSubject;
    readonly reason: string;
    readonly correlationId: CorrelationId;
    readonly subjectId?: UserId | null;
    readonly channelId?: ChannelId | null;
    readonly caseId?: string | null;
    readonly durationSeconds?: number | null;
    readonly expiresAt?: Date | null;
    readonly metadata?: Readonly<Record<string, JsonValue>>;
  }): Promise<ModerationActionRow> {
    const row = await this.options.repositories.moderation.record({
      guildId: input.guildId,
      action: input.action,
      actorId: input.actor.userId,
      reason: input.reason,
      subjectId: input.subjectId ?? null,
      channelId: input.channelId ?? null,
      caseId: input.caseId ?? null,
      durationSeconds: input.durationSeconds ?? null,
      expiresAt: input.expiresAt ?? null,
      metadata: input.metadata ?? {},
      correlationId: input.correlationId,
    });

    await this.options.repositories.audit.append({
      guildId: input.guildId,
      botName: 'guardian',
      event: `moderation.${input.action}`,
      severity: 'warn',
      actorId: input.actor.userId,
      ...(input.subjectId ? { targetId: input.subjectId } : {}),
      ...(input.channelId ? { channelId: input.channelId } : {}),
      source: `command:${input.action}`,
      correlationId: input.correlationId,
      details: {
        action: input.action,
        action_id: row.id,
        ...(input.caseId ? { case_id: input.caseId } : {}),
      },
    });

    if (input.caseId) {
      await this.options.repositories.cases.appendEvent({
        caseId: input.caseId,
        eventType: 'action_recorded',
        actorId: input.actor.userId,
        body: `${MODERATION_ACTION_LABELS[input.action]} — ${input.reason}`,
        correlationId: input.correlationId,
      });
    }

    return row;
  }

  /**
   * Tell the member what happened.
   *
   * Best effort and never fatal. Most people have server DMs closed, so a
   * failure here says nothing about whether the action worked, and treating it
   * as an error would make routine moderation look broken.
   */
  private async notify(
    userId: UserId,
    action: ModerationAction,
    guildName: string,
    reason: string,
    extra?: string,
  ): Promise<boolean> {
    try {
      return await this.options.messaging.sendDirectMessage(
        userId,
        copy.memberNotice(action, guildName, reason, extra),
      );
    } catch (error) {
      this.options.logger.debug('moderation.dm_failed', 'Could not DM the member.', {
        context: { user_id: userId, action },
        ...(error instanceof BloomError ? { error } : {}),
      });
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Warnings and notes — database only
  // ---------------------------------------------------------------------------

  public async warn(request: MemberActionRequest): Promise<ActionOutcome> {
    await this.authorise('warn', request.guildId, request.actor, request.targetId);
    const caseId = await this.resolveCaseId(request.guildId, request.caseNumber);
    const reason = cleanReason(request.reason);

    const row = await this.record({
      action: 'warn',
      guildId: request.guildId,
      actor: request.actor,
      reason,
      correlationId: request.correlationId,
      subjectId: request.targetId,
      caseId,
    });

    const activeWarnings =
      await this.options.repositories.moderation.countActiveWarnings(
        request.guildId,
        request.targetId,
      );

    const guildName = await this.options.guilds.getGuildName(request.guildId);
    const memberNotified = await this.notify(
      request.targetId,
      'warn',
      guildName,
      reason,
      copy.warningCount(activeWarnings),
    );

    return { action: 'warn', record: row, memberNotified, activeWarnings };
  }

  /**
   * A private staff note.
   *
   * The member is deliberately not notified. A note is staff context — "this
   * came up before", "handled informally" — and notifying would turn every
   * piece of context into a confrontation, which stops people writing them.
   */
  public async note(request: MemberActionRequest): Promise<ActionOutcome> {
    await this.authorise('note', request.guildId, request.actor, request.targetId);
    const caseId = await this.resolveCaseId(request.guildId, request.caseNumber);

    const row = await this.record({
      action: 'note',
      guildId: request.guildId,
      actor: request.actor,
      reason: cleanReason(request.reason),
      correlationId: request.correlationId,
      subjectId: request.targetId,
      caseId,
    });

    return { action: 'note', record: row, memberNotified: false };
  }

  public async clearWarnings(
    request: MemberActionRequest,
  ): Promise<ActionOutcome & { readonly cleared: number }> {
    await this.authorise(
      'clear_warnings',
      request.guildId,
      request.actor,
      request.targetId,
    );
    const reason = cleanReason(request.reason);

    const cleared = await this.options.repositories.moderation.revokeActiveWarnings({
      guildId: request.guildId,
      subjectId: request.targetId,
      revokedBy: request.actor.userId,
      reason,
    });

    // Recorded even when nothing was cleared. "A moderator ran this and there
    // was nothing to clear" is itself worth knowing.
    const row = await this.record({
      action: 'clear_warnings',
      guildId: request.guildId,
      actor: request.actor,
      reason,
      correlationId: request.correlationId,
      subjectId: request.targetId,
      metadata: { cleared },
    });

    return {
      action: 'clear_warnings',
      record: row,
      memberNotified: false,
      cleared,
      activeWarnings: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Actions with a Discord effect
  // ---------------------------------------------------------------------------

  public async timeout(request: TimeoutRequest): Promise<ActionOutcome> {
    await this.authorise('timeout', request.guildId, request.actor, request.targetId);
    const caseId = await this.resolveCaseId(request.guildId, request.caseNumber);
    const reason = cleanReason(request.reason);
    const until = new Date(this.clock.now() + request.durationMs);

    const guildName = await this.options.guilds.getGuildName(request.guildId);

    /*
     * DM before the timeout, not after.
     *
     * A timed-out member can still receive DMs, so ordering is not strictly
     * required — but it costs nothing and removes any dependence on that
     * remaining true.
     */
    const memberNotified = await this.notify(
      request.targetId,
      'timeout',
      guildName,
      reason,
      copy.until(until),
    );

    await this.options.discord.timeoutMember({
      guildId: request.guildId,
      userId: request.targetId,
      until,
      reason: staffReason(request.actor.userId, reason),
    });

    const row = await this.record({
      action: 'timeout',
      guildId: request.guildId,
      actor: request.actor,
      reason,
      correlationId: request.correlationId,
      subjectId: request.targetId,
      caseId,
      durationSeconds: Math.round(request.durationMs / 1000),
      expiresAt: until,
    });

    return { action: 'timeout', record: row, memberNotified };
  }

  public async removeTimeout(request: MemberActionRequest): Promise<ActionOutcome> {
    await this.authorise('untimeout', request.guildId, request.actor, request.targetId);
    const reason = cleanReason(request.reason);

    await this.options.discord.removeTimeout({
      guildId: request.guildId,
      userId: request.targetId,
      reason: staffReason(request.actor.userId, reason),
    });

    const row = await this.record({
      action: 'untimeout',
      guildId: request.guildId,
      actor: request.actor,
      reason,
      correlationId: request.correlationId,
      subjectId: request.targetId,
    });

    const guildName = await this.options.guilds.getGuildName(request.guildId);
    const memberNotified = await this.notify(
      request.targetId,
      'untimeout',
      guildName,
      reason,
    );

    return { action: 'untimeout', record: row, memberNotified };
  }

  public async kick(request: MemberActionRequest): Promise<ActionOutcome> {
    await this.authorise('kick', request.guildId, request.actor, request.targetId);
    const caseId = await this.resolveCaseId(request.guildId, request.caseNumber);
    const reason = cleanReason(request.reason);
    const guildName = await this.options.guilds.getGuildName(request.guildId);

    /*
     * DM first, and this time it matters: once the member is removed, Bloom no
     * longer shares a server with them and Discord will refuse the DM. Telling
     * someone why they were removed is the difference between moderation and
     * an unexplained disappearance.
     */
    const memberNotified = await this.notify(
      request.targetId,
      'kick',
      guildName,
      reason,
    );

    await this.options.discord.kickMember({
      guildId: request.guildId,
      userId: request.targetId,
      reason: staffReason(request.actor.userId, reason),
    });

    const row = await this.record({
      action: 'kick',
      guildId: request.guildId,
      actor: request.actor,
      reason,
      correlationId: request.correlationId,
      subjectId: request.targetId,
      caseId,
    });

    return { action: 'kick', record: row, memberNotified };
  }

  public async ban(request: BanRequest): Promise<ActionOutcome> {
    await this.authorise('ban', request.guildId, request.actor, request.targetId);
    const caseId = await this.resolveCaseId(request.guildId, request.caseNumber);
    const reason = cleanReason(request.reason);
    const guildName = await this.options.guilds.getGuildName(request.guildId);

    const memberNotified = await this.notify(request.targetId, 'ban', guildName, reason);

    await this.options.discord.banMember({
      guildId: request.guildId,
      userId: request.targetId,
      reason: staffReason(request.actor.userId, reason),
      ...(request.deleteMessageSeconds === undefined
        ? {}
        : { deleteMessageSeconds: request.deleteMessageSeconds }),
    });

    const row = await this.record({
      action: 'ban',
      guildId: request.guildId,
      actor: request.actor,
      reason,
      correlationId: request.correlationId,
      subjectId: request.targetId,
      caseId,
      metadata: { delete_message_seconds: request.deleteMessageSeconds ?? 0 },
    });

    return { action: 'ban', record: row, memberNotified };
  }

  public async unban(
    request: MemberActionRequest,
  ): Promise<ActionOutcome & { readonly wasBanned: boolean }> {
    await this.authorise('unban', request.guildId, request.actor, request.targetId);
    const reason = cleanReason(request.reason);

    const wasBanned = await this.options.discord.unbanMember({
      guildId: request.guildId,
      userId: request.targetId,
      reason: staffReason(request.actor.userId, reason),
    });

    const row = await this.record({
      action: 'unban',
      guildId: request.guildId,
      actor: request.actor,
      reason,
      correlationId: request.correlationId,
      subjectId: request.targetId,
      metadata: { was_banned: wasBanned },
    });

    return { action: 'unban', record: row, memberNotified: false, wasBanned };
  }

  // ---------------------------------------------------------------------------
  // Channel actions
  // ---------------------------------------------------------------------------

  public async purge(request: {
    readonly guildId: GuildId;
    readonly actor: AuthorizationSubject;
    readonly channelId: ChannelId;
    readonly limit: number;
    readonly authorId?: UserId | null;
    readonly reason: string;
    readonly correlationId: CorrelationId;
  }): Promise<{ readonly result: PurgeResult; readonly record: ModerationActionRow }> {
    // Purging one member's messages is an action against that member, so it
    // goes through the same target protection as a kick would.
    if (request.authorId) {
      await this.authorise('purge', request.guildId, request.actor, request.authorId);
    }

    const reason = cleanReason(request.reason);
    const result = await this.options.channels.purgeMessages({
      guildId: request.guildId,
      channelId: request.channelId,
      limit: request.limit,
      ...(request.authorId ? { authorId: request.authorId } : {}),
      reason: staffReason(request.actor.userId, reason),
    });

    const record = await this.record({
      action: 'purge',
      guildId: request.guildId,
      actor: request.actor,
      reason,
      correlationId: request.correlationId,
      channelId: request.channelId,
      subjectId: request.authorId ?? null,
      metadata: {
        requested: result.requested,
        deleted: result.deleted,
        skipped_too_old: result.skippedTooOld,
      },
    });

    return { result, record };
  }

  public async slowmode(request: {
    readonly guildId: GuildId;
    readonly actor: AuthorizationSubject;
    readonly channelId: ChannelId;
    readonly seconds: number;
    readonly reason: string;
    readonly correlationId: CorrelationId;
  }): Promise<ModerationActionRow> {
    const reason = cleanReason(request.reason);

    await this.options.channels.setSlowmode({
      guildId: request.guildId,
      channelId: request.channelId,
      seconds: request.seconds,
      reason: staffReason(request.actor.userId, reason),
    });

    return this.record({
      action: 'slowmode',
      guildId: request.guildId,
      actor: request.actor,
      reason,
      correlationId: request.correlationId,
      channelId: request.channelId,
      metadata: { seconds: request.seconds },
    });
  }

  /**
   * Lock or unlock a channel.
   *
   * Unlock restores the exact permission state the channel had before the lock,
   * read from the lock's own metadata rather than assumed. The naive
   * implementation — unlock sets "allowed" — would silently open a channel that
   * was previously restricted to a role, which is a security regression
   * disguised as a convenience.
   */
  public async setLock(request: {
    readonly guildId: GuildId;
    readonly actor: AuthorizationSubject;
    readonly channelId: ChannelId;
    readonly locked: boolean;
    readonly reason: string;
    readonly correlationId: CorrelationId;
  }): Promise<{
    readonly record: ModerationActionRow;
    readonly previous: ChannelSendPermission;
    readonly changed: boolean;
  }> {
    const reason = cleanReason(request.reason);
    const current = await this.options.channels.getSendPermission(
      request.guildId,
      request.channelId,
    );

    if (request.locked) {
      if (current === 'denied') {
        const record = await this.record({
          action: 'lock',
          guildId: request.guildId,
          actor: request.actor,
          reason,
          correlationId: request.correlationId,
          channelId: request.channelId,
          metadata: { previous: current, noop: true },
        });
        return { record, previous: current, changed: false };
      }

      await this.options.channels.setSendPermission({
        guildId: request.guildId,
        channelId: request.channelId,
        state: 'denied',
        reason: staffReason(request.actor.userId, reason),
      });

      const record = await this.record({
        action: 'lock',
        guildId: request.guildId,
        actor: request.actor,
        reason,
        correlationId: request.correlationId,
        channelId: request.channelId,
        metadata: { previous: current },
      });
      return { record, previous: current, changed: true };
    }

    // Unlocking: find what the channel looked like before the most recent lock.
    const restoreTo = await this.previousSendPermission(
      request.guildId,
      request.channelId,
    );

    await this.options.channels.setSendPermission({
      guildId: request.guildId,
      channelId: request.channelId,
      state: restoreTo,
      reason: staffReason(request.actor.userId, reason),
    });

    const record = await this.record({
      action: 'unlock',
      guildId: request.guildId,
      actor: request.actor,
      reason,
      correlationId: request.correlationId,
      channelId: request.channelId,
      metadata: { restored_to: restoreTo },
    });

    return { record, previous: current, changed: current !== restoreTo };
  }

  /**
   * What this channel's `@everyone` send permission was before Bloom locked it.
   *
   * Falls back to `inherited`, which is the safe direction: it removes the
   * explicit deny and lets category permissions decide, rather than inventing
   * an explicit allow for a channel whose history we cannot see.
   */
  private async previousSendPermission(
    guildId: GuildId,
    channelId: ChannelId,
  ): Promise<ChannelSendPermission> {
    const recent = await this.options.repositories.moderation.listForChannel(
      guildId,
      channelId,
      { limit: 1, actions: ['lock'] },
    );

    const previous = recent[0]?.metadata['previous'];
    return previous === 'allowed' || previous === 'denied' || previous === 'inherited'
      ? previous
      : 'inherited';
  }
}

/**
 * Normalise a moderator-supplied reason.
 *
 * Reasons reach Discord's audit log, a DM to the member, and the staff channel.
 * Neutralising mentions stops `/warn @x "stop pinging @everyone"` from doing the
 * very thing it is complaining about.
 */
function cleanReason(reason: string): string {
  const cleaned = sanitiseUserText(reason, 480);
  if (cleaned.length === 0) {
    throw bloomError('INVALID_INPUT', {
      userMessage: 'A reason is required.',
    });
  }
  return cleaned;
}

/** What Discord's own audit log will show. */
function staffReason(actorId: UserId, reason: string): string {
  return `[${actorId}] ${reason}`;
}
