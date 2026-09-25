import {
  ChannelType,
  DiscordAPIError,
  PermissionFlagsBits,
  type Client,
  type Collection,
  type Guild,
  type GuildBasedChannel,
  type Message,
  type TextChannel,
} from 'discord.js';
import {
  bloomError,
  type BotName,
  type ChannelId,
  type GuildId,
  type UserId,
} from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import { assertCapability } from '@bloom/permissions';
import { sanitiseReason } from '@bloom/security';
import type {
  ChannelModerationService,
  ChannelSendPermission,
  PurgeResult,
} from '../ports.js';

/** Discord's own ceiling on `rate_limit_per_user`, in seconds (6 hours). */
export const MAX_SLOWMODE_SECONDS = 21_600;

/** Discord refuses to bulk-delete messages older than this. */
const BULK_DELETE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** Discord's bulk-delete batch limit. */
const BULK_DELETE_MAX = 100;

/**
 * Channel moderation: slowmode, locking, purges. Guardian only.
 *
 * The honesty requirement drives most of the design here. `/purge 100` on a
 * channel whose last 100 messages are three weeks old deletes nothing, because
 * Discord will not bulk-delete anything older than 14 days. Reporting "purged
 * 100 messages" in that case would be exactly the fake functionality the brief
 * forbids, so `purgeMessages` counts what it actually removed and reports what
 * it had to skip.
 */
export class DiscordChannelModerationService implements ChannelModerationService {
  public constructor(
    private readonly client: Client,
    private readonly logger: Logger,
    bot: BotName,
  ) {
    assertCapability(bot, 'message:manage');
  }

  private async guild(guildId: GuildId): Promise<Guild> {
    const guild = await this.client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      throw bloomError('GUILD_MISMATCH', {
        operatorHint: `Guardian is not in guild ${guildId}.`,
        details: { guild_id: guildId },
      });
    }
    return guild;
  }

  /**
   * Resolve a channel we are allowed to moderate.
   *
   * Only text channels. Threads, forums, voice and category channels each have
   * different permission semantics, and quietly doing something approximate to
   * one of them is worse than refusing.
   */
  private async textChannel(
    guildId: GuildId,
    channelId: ChannelId,
  ): Promise<TextChannel> {
    const guild = await this.guild(guildId);
    const channel: GuildBasedChannel | null = await guild.channels
      .fetch(channelId)
      .catch(() => null);

    if (!channel) {
      throw bloomError('CHANNEL_NOT_FOUND', {
        userMessage: 'That channel could not be found.',
        details: { channel_id: channelId },
      });
    }

    if (channel.type !== ChannelType.GuildText) {
      throw bloomError('CHANNEL_RESTRICTED', {
        userMessage: 'That command only works in a standard text channel.',
        operatorHint: `Channel ${channelId} is type ${String(channel.type)}. Slowmode, lock and purge are implemented for text channels only; threads and forums have different permission semantics and are not supported yet.`,
        details: { channel_id: channelId, channel_type: channel.type },
      });
    }

    return channel;
  }

  public async setSlowmode(input: {
    readonly guildId: GuildId;
    readonly channelId: ChannelId;
    readonly seconds: number;
    readonly reason: string;
  }): Promise<void> {
    if (
      !Number.isInteger(input.seconds) ||
      input.seconds < 0 ||
      input.seconds > MAX_SLOWMODE_SECONDS
    ) {
      throw bloomError('INVALID_INPUT', {
        userMessage: `Slowmode must be between 0 and ${String(MAX_SLOWMODE_SECONDS)} seconds.`,
        details: { seconds: input.seconds },
      });
    }

    const channel = await this.textChannel(input.guildId, input.channelId);
    try {
      await channel.setRateLimitPerUser(input.seconds, sanitiseReason(input.reason));
    } catch (error) {
      throw translate(error, 'slowmode');
    }

    this.logger.info('moderation.slowmode', 'Set channel slowmode.', {
      context: { channel_id: input.channelId, seconds: input.seconds },
    });
  }

  public async getSendPermission(
    guildId: GuildId,
    channelId: ChannelId,
  ): Promise<ChannelSendPermission> {
    const channel = await this.textChannel(guildId, channelId);
    const everyone = channel.guild.roles.everyone;
    const overwrite = channel.permissionOverwrites.cache.get(everyone.id);

    if (!overwrite) return 'inherited';
    if (overwrite.deny.has(PermissionFlagsBits.SendMessages)) return 'denied';
    if (overwrite.allow.has(PermissionFlagsBits.SendMessages)) return 'allowed';
    return 'inherited';
  }

  public async setSendPermission(input: {
    readonly guildId: GuildId;
    readonly channelId: ChannelId;
    readonly state: ChannelSendPermission;
    readonly reason: string;
  }): Promise<void> {
    const channel = await this.textChannel(input.guildId, input.channelId);
    const everyone = channel.guild.roles.everyone;
    const reason = sanitiseReason(input.reason);

    /*
     * `null` is the third state and the reason this port has three values
     * rather than a boolean: it clears the overwrite so the channel inherits
     * from its category again. Writing `true` on unlock would grant send access
     * to a channel that may never have had it — a lock followed by an unlock
     * would quietly open a staff-only channel to everyone.
     */
    const sendMessages =
      input.state === 'denied' ? false : input.state === 'allowed' ? true : null;

    try {
      await channel.permissionOverwrites.edit(
        everyone,
        {
          SendMessages: sendMessages,
          SendMessagesInThreads: sendMessages,
          CreatePublicThreads: sendMessages,
          CreatePrivateThreads: sendMessages,
        },
        { reason },
      );
    } catch (error) {
      throw translate(error, 'lock');
    }

    this.logger.info('moderation.channel_permission', 'Changed channel send access.', {
      context: { channel_id: input.channelId, state: input.state },
    });
  }

  public async purgeMessages(input: {
    readonly guildId: GuildId;
    readonly channelId: ChannelId;
    readonly limit: number;
    readonly authorId?: UserId;
    readonly reason: string;
  }): Promise<PurgeResult> {
    if (
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > BULK_DELETE_MAX
    ) {
      throw bloomError('INVALID_INPUT', {
        userMessage: `Purge can remove between 1 and ${String(BULK_DELETE_MAX)} messages at a time.`,
        operatorHint:
          'Discord only bulk-deletes up to 100 messages per call. Larger purges would need repeated calls, which is deliberately not offered: a runaway purge is unrecoverable.',
        details: { limit: input.limit },
      });
    }

    const channel = await this.textChannel(input.guildId, input.channelId);

    let fetched: Collection<string, Message<true>>;
    try {
      /*
       * Over-fetch when filtering by author: the last N messages in the channel
       * are usually not the last N by that member. 100 is the API maximum, so
       * this is best-effort and documented as such — a member whose messages
       * are scattered further back will have only the recent ones removed.
       */
      fetched = await channel.messages.fetch({
        limit: input.authorId ? BULK_DELETE_MAX : input.limit,
      });
    } catch (error) {
      throw translate(error, 'purge');
    }

    const cutoff = Date.now() - BULK_DELETE_MAX_AGE_MS;
    const candidates = [...fetched.values()]
      .filter((message) => !input.authorId || message.author.id === input.authorId)
      .filter((message) => !message.pinned)
      .slice(0, input.limit);

    const deletable = candidates.filter((message) => message.createdTimestamp > cutoff);
    const skippedTooOld = candidates.length - deletable.length;

    if (deletable.length === 0) {
      return { requested: input.limit, deleted: 0, skippedTooOld };
    }

    let deleted: number;
    try {
      const removed = await channel.bulkDelete(deletable, true);
      deleted = removed.size;
    } catch (error) {
      throw translate(error, 'purge');
    }

    this.logger.info('moderation.purge', 'Purged messages.', {
      context: {
        channel_id: input.channelId,
        requested: input.limit,
        deleted,
        skipped_too_old: skippedTooOld,
        ...(input.authorId ? { author_id: input.authorId } : {}),
      },
    });

    return { requested: input.limit, deleted, skippedTooOld };
  }
}

function translate(error: unknown, action: string): unknown {
  if (!(error instanceof DiscordAPIError)) return error;

  switch (error.code) {
    case 50013:
      return bloomError('BOT_MISSING_PERMISSION', {
        userMessage: 'Bloom could not complete that action.',
        operatorHint:
          `Discord refused "${action}" with "Missing Permissions". Guardian needs Manage Channels for slowmode, Manage Roles for lock, ` +
          'and Manage Messages plus Read Message History for purge — on the channel itself, which a channel-level overwrite can remove even when the server-level grant exists.',
        details: { action, discord_code: 50013 },
        cause: error,
      });

    case 10003:
      return bloomError('CHANNEL_NOT_FOUND', {
        userMessage: 'That channel could not be found.',
        operatorHint: 'The channel was deleted between the command and the API call.',
        cause: error,
      });

    case 50034:
      return bloomError('INVALID_INPUT', {
        userMessage:
          'Those messages are too old to delete in bulk. Discord only allows this for messages under 14 days old.',
        operatorHint:
          'Discord returned 50034. The pre-filter should normally prevent this; a message aged past the cutoff between fetch and delete.',
        cause: error,
      });

    default:
      return bloomError('DISCORD_API_ERROR', {
        operatorHint: `Discord rejected "${action}" with code ${String(error.code)}: ${error.message}`,
        details: { action, discord_code: error.code },
        cause: error,
      });
  }
}
