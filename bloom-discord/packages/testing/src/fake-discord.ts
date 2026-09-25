import {
  bloomError,
  unsafeSnowflake,
  type ChannelId,
  type GuildId,
  type MessageId,
  type RoleId,
  type UserId,
} from '@bloom/shared-types';
import type { BloomMessage } from '@bloom/embeds';
import type { RoleSnapshot } from '@bloom/permissions';
import { MAX_TIMEOUT_MS } from '@bloom/utils';
import type {
  BotSelfSnapshot,
  ChannelModerationService,
  ChannelSendPermission,
  GuildQueryService,
  MemberSnapshot,
  MessagingService,
  ModerationService,
  PurgeResult,
  RoleService,
} from '@bloom/discord';
import {
  TEST_GUILD_ID,
  TEST_ROLE_IDS,
  TEST_ROLE_POSITIONS,
  TEST_USER_IDS,
} from './fixtures.js';

/**
 * An in-memory Discord.
 *
 * This is the payoff for putting every Discord operation behind a port: a whole
 * guild — roles, positions, members, channels — that a test can set up in three
 * lines, with no network, no token and no rate limits.
 *
 * It models the behaviours that matter for correctness, including the ones that
 * are easy to forget: role hierarchy refusals, members who have left, closed
 * DMs, and channels the bot cannot see.
 */
export class FakeGuild implements GuildQueryService {
  public readonly roles = new Map<RoleId, RoleSnapshot>();
  public readonly members = new Map<UserId, MemberSnapshot>();
  public readonly channels = new Set<ChannelId>();
  public name = 'Bloom Labs (test)';

  /** Channels the bot can see but not post in — modelling a permission overwrite. */
  public readonly unpostableChannels = new Set<ChannelId>();

  private self: BotSelfSnapshot = {
    userId: TEST_USER_IDS.bot,
    applicationId: '900000000000009001',
    highestRolePosition: TEST_ROLE_POSITIONS.bloomBot,
    highestRoleName: '◉ Bloom Bot',
    // Manage Roles | View Channel | Send Messages | Embed Links
    permissions: (1n << 28n) | (1n << 10n) | (1n << 11n) | (1n << 14n),
  };

  public constructor(public readonly guildId: GuildId = TEST_GUILD_ID) {}

  /** Populate with the documented role set at the documented positions. */
  public withStandardRoles(): this {
    const names: Record<string, string> = {
      founder: '✦ Founder',
      administrator: '◈ Administrator',
      moderator: '⟡ Moderator',
      bloomBot: '◉ Bloom Bot',
      betaTester: '◌ Beta Tester',
      earlyBloom: '✧ Early Bloom',
      bloomMember: '❋ Bloom Member',
    };

    for (const [key, id] of Object.entries(TEST_ROLE_IDS)) {
      this.roles.set(id, {
        id,
        name: names[key] ?? key,
        position: TEST_ROLE_POSITIONS[key as keyof typeof TEST_ROLE_POSITIONS],
        // The bot's own role is managed by Discord, which is why the platform
        // can never move it itself.
        managed: key === 'bloomBot',
      });
    }
    return this;
  }

  public withMember(
    userId: UserId,
    options: { readonly roleIds?: readonly RoleId[]; readonly isOwner?: boolean } = {},
  ): this {
    const roleIds = options.roleIds ?? [];
    const highest = roleIds.reduce(
      (max, id) => Math.max(max, this.roles.get(id)?.position ?? 0),
      0,
    );

    this.members.set(userId, {
      userId,
      username: `member-${userId.slice(-4)}`,
      roleIds,
      highestRolePosition: highest,
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
      isGuildOwner: options.isOwner ?? false,
      communicationDisabledUntil: null,
    });
    return this;
  }

  public withChannels(...ids: readonly ChannelId[]): this {
    for (const id of ids) this.channels.add(id);
    return this;
  }

  /** Move the bot's role. The single most useful knob for hierarchy tests. */
  public withBotAtPosition(position: number): this {
    this.self = { ...this.self, highestRolePosition: position };
    return this;
  }

  public withBotPermissions(permissions: bigint): this {
    this.self = { ...this.self, permissions };
    return this;
  }

  public getGuildName(): Promise<string> {
    return Promise.resolve(this.name);
  }

  public getMember(_guildId: GuildId, userId: UserId): Promise<MemberSnapshot | null> {
    return Promise.resolve(this.members.get(userId) ?? null);
  }

  public getRoles(): Promise<ReadonlyMap<RoleId, RoleSnapshot>> {
    return Promise.resolve(this.roles);
  }

  public getRole(_guildId: GuildId, roleId: RoleId): Promise<RoleSnapshot | null> {
    return Promise.resolve(this.roles.get(roleId) ?? null);
  }

  public getSelf(): Promise<BotSelfSnapshot> {
    return Promise.resolve(this.self);
  }

  public channelExists(_guildId: GuildId, channelId: ChannelId): Promise<boolean> {
    return Promise.resolve(this.channels.has(channelId));
  }
}

export interface RecordedRoleChange {
  readonly action: 'add' | 'remove';
  readonly userId: UserId;
  readonly roleId: RoleId;
  readonly reason: string;
}

/**
 * A role service that records instead of calling Discord.
 *
 * It still enforces hierarchy and membership, because a fake that always
 * succeeds would let a test pass while the real implementation refuses.
 */
export class FakeRoleService implements RoleService {
  public readonly changes: RecordedRoleChange[] = [];

  public constructor(private readonly guild: FakeGuild) {}

  public async assignRole(input: {
    guildId: GuildId;
    userId: UserId;
    roleId: RoleId;
    reason: string;
  }): Promise<void> {
    await this.mutate('add', input);
  }

  public async removeRole(input: {
    guildId: GuildId;
    userId: UserId;
    roleId: RoleId;
    reason: string;
  }): Promise<void> {
    await this.mutate('remove', input);
  }

  private async mutate(
    action: 'add' | 'remove',
    input: { guildId: GuildId; userId: UserId; roleId: RoleId; reason: string },
  ): Promise<void> {
    const role = await this.guild.getRole(input.guildId, input.roleId);
    if (!role) {
      throw bloomError('ROLE_NOT_FOUND', {
        operatorHint: `Fake guild has no role ${input.roleId}.`,
      });
    }

    const self = await this.guild.getSelf();
    if (self.highestRolePosition <= role.position) {
      throw bloomError('ROLE_HIERARCHY_BLOCKED', {
        operatorHint: `Bot at position ${String(self.highestRolePosition)} cannot manage "${role.name}" at position ${String(role.position)}.`,
      });
    }

    const member = this.guild.members.get(input.userId);
    if (!member) {
      throw bloomError('MEMBER_NOT_FOUND', {
        operatorHint: `Fake guild has no member ${input.userId}.`,
      });
    }

    const holds = member.roleIds.includes(input.roleId);
    if ((action === 'add' && holds) || (action === 'remove' && !holds)) return;

    const roleIds =
      action === 'add'
        ? [...member.roleIds, input.roleId]
        : member.roleIds.filter((id) => id !== input.roleId);

    this.guild.members.set(input.userId, {
      ...member,
      roleIds,
      highestRolePosition: roleIds.reduce(
        (max, id) => Math.max(max, this.guild.roles.get(id)?.position ?? 0),
        0,
      ),
    });

    this.changes.push({
      action,
      userId: input.userId,
      roleId: input.roleId,
      reason: input.reason,
    });
  }
}

export interface RecordedMessage {
  readonly channelId: ChannelId;
  readonly message: BloomMessage;
}

export interface RecordedDirectMessage {
  readonly userId: UserId;
  readonly message: BloomMessage;
  readonly delivered: boolean;
}

export class FakeMessaging implements MessagingService {
  public readonly sent: RecordedMessage[] = [];
  public readonly directMessages: RecordedDirectMessage[] = [];
  /** Members who have DMs closed. The default is delivery, the exception is opt-in. */
  public readonly dmBlocked = new Set<UserId>();

  private nextId = 1;

  public constructor(private readonly guild?: FakeGuild) {}

  public sendToChannel(
    _guildId: GuildId,
    channelId: ChannelId,
    message: BloomMessage,
  ): Promise<MessageId> {
    if (this.guild && !this.guild.channels.has(channelId)) {
      return Promise.reject(
        bloomError('CHANNEL_NOT_FOUND', {
          operatorHint: `Fake guild has no channel ${channelId}.`,
        }),
      );
    }

    if (this.guild?.unpostableChannels.has(channelId)) {
      return Promise.reject(
        bloomError('BOT_MISSING_PERMISSION', {
          operatorHint: `Fake guild denies Send Messages in ${channelId}.`,
        }),
      );
    }

    this.sent.push({ channelId, message });
    return Promise.resolve(
      unsafeSnowflake<MessageId>(
        `90000000000004${String(this.nextId++).padStart(4, '0')}`,
      ),
    );
  }

  public sendDirectMessage(userId: UserId, message: BloomMessage): Promise<boolean> {
    const delivered = !this.dmBlocked.has(userId);
    this.directMessages.push({ userId, message, delivered });
    return Promise.resolve(delivered);
  }

  public lastIn(channelId: ChannelId): BloomMessage | undefined {
    return [...this.sent].reverse().find((entry) => entry.channelId === channelId)
      ?.message;
  }

  public clear(): void {
    this.sent.length = 0;
    this.directMessages.length = 0;
  }
}

// -----------------------------------------------------------------------------
// Moderation
// -----------------------------------------------------------------------------

export interface RecordedModerationCall {
  readonly action: 'timeout' | 'untimeout' | 'kick' | 'ban' | 'unban';
  readonly userId: UserId;
  readonly reason: string;
  readonly until?: Date;
  readonly deleteMessageSeconds?: number;
}

/**
 * In-memory member moderation.
 *
 * Models the behaviours a test can get wrong by assuming: a timeout longer than
 * 28 days is refused, unbanning someone who is not banned returns `false`
 * rather than throwing, and a member who is not in the guild cannot be kicked
 * but *can* be banned.
 */
export class FakeModerationService implements ModerationService {
  public readonly calls: RecordedModerationCall[] = [];
  public readonly bans = new Set<UserId>();
  /** Set to make the next call fail, e.g. to test partial-failure handling. */
  public failNext: Error | null = null;

  public constructor(private readonly guild: FakeGuild) {}

  private check(): void {
    if (this.failNext) {
      const error = this.failNext;
      this.failNext = null;
      throw error;
    }
  }

  private requireMember(userId: UserId): void {
    if (!this.guild.members.has(userId)) {
      throw bloomError('MEMBER_NOT_FOUND', {
        operatorHint: `Fake guild has no member ${userId}.`,
      });
    }
  }

  public timeoutMember(input: {
    guildId: GuildId;
    userId: UserId;
    until: Date;
    reason: string;
  }): Promise<void> {
    this.check();
    this.requireMember(input.userId);
    if (input.until.getTime() - Date.now() > MAX_TIMEOUT_MS) {
      throw bloomError('INVALID_INPUT', {
        userMessage: 'Timeouts cannot be longer than 28 days.',
      });
    }
    this.calls.push({
      action: 'timeout',
      userId: input.userId,
      reason: input.reason,
      until: input.until,
    });
    return Promise.resolve();
  }

  public removeTimeout(input: {
    guildId: GuildId;
    userId: UserId;
    reason: string;
  }): Promise<void> {
    this.check();
    this.requireMember(input.userId);
    this.calls.push({
      action: 'untimeout',
      userId: input.userId,
      reason: input.reason,
    });
    return Promise.resolve();
  }

  public kickMember(input: {
    guildId: GuildId;
    userId: UserId;
    reason: string;
  }): Promise<void> {
    this.check();
    this.requireMember(input.userId);
    this.guild.members.delete(input.userId);
    this.calls.push({ action: 'kick', userId: input.userId, reason: input.reason });
    return Promise.resolve();
  }

  public banMember(input: {
    guildId: GuildId;
    userId: UserId;
    reason: string;
    deleteMessageSeconds?: number;
  }): Promise<void> {
    this.check();
    // Deliberately no membership check: banning an id that never joined is a
    // supported workflow and the fake has to allow a test to prove it.
    this.guild.members.delete(input.userId);
    this.bans.add(input.userId);
    this.calls.push({
      action: 'ban',
      userId: input.userId,
      reason: input.reason,
      ...(input.deleteMessageSeconds === undefined
        ? {}
        : { deleteMessageSeconds: input.deleteMessageSeconds }),
    });
    return Promise.resolve();
  }

  public unbanMember(input: {
    guildId: GuildId;
    userId: UserId;
    reason: string;
  }): Promise<boolean> {
    this.check();
    this.calls.push({ action: 'unban', userId: input.userId, reason: input.reason });
    return Promise.resolve(this.bans.delete(input.userId));
  }
}

export interface RecordedChannelCall {
  readonly action: 'slowmode' | 'send_permission' | 'purge';
  readonly channelId: ChannelId;
  readonly reason: string;
  readonly seconds?: number;
  readonly state?: ChannelSendPermission;
}

/** In-memory channel moderation, including the 14-day bulk-delete cutoff. */
export class FakeChannelModerationService implements ChannelModerationService {
  public readonly calls: RecordedChannelCall[] = [];
  public readonly slowmode = new Map<ChannelId, number>();
  public readonly sendPermission = new Map<ChannelId, ChannelSendPermission>();
  /** Messages available to purge, newest first. */
  public messages: { readonly authorId: UserId; readonly createdAt: Date }[] = [];

  public setSlowmode(input: {
    guildId: GuildId;
    channelId: ChannelId;
    seconds: number;
    reason: string;
  }): Promise<void> {
    this.slowmode.set(input.channelId, input.seconds);
    this.calls.push({
      action: 'slowmode',
      channelId: input.channelId,
      reason: input.reason,
      seconds: input.seconds,
    });
    return Promise.resolve();
  }

  public getSendPermission(
    _guildId: GuildId,
    channelId: ChannelId,
  ): Promise<ChannelSendPermission> {
    return Promise.resolve(this.sendPermission.get(channelId) ?? 'inherited');
  }

  public setSendPermission(input: {
    guildId: GuildId;
    channelId: ChannelId;
    state: ChannelSendPermission;
    reason: string;
  }): Promise<void> {
    this.sendPermission.set(input.channelId, input.state);
    this.calls.push({
      action: 'send_permission',
      channelId: input.channelId,
      reason: input.reason,
      state: input.state,
    });
    return Promise.resolve();
  }

  public purgeMessages(input: {
    guildId: GuildId;
    channelId: ChannelId;
    limit: number;
    authorId?: UserId;
    reason: string;
  }): Promise<PurgeResult> {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const candidates = this.messages
      .filter((m) => !input.authorId || m.authorId === input.authorId)
      .slice(0, input.limit);
    const deletable = candidates.filter((m) => m.createdAt.getTime() > cutoff);

    this.calls.push({
      action: 'purge',
      channelId: input.channelId,
      reason: input.reason,
    });
    this.messages = this.messages.filter((m) => !deletable.includes(m));

    return Promise.resolve({
      requested: input.limit,
      deleted: deletable.length,
      skippedTooOld: candidates.length - deletable.length,
    });
  }
}
