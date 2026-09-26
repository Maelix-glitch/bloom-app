import { DiscordAPIError, type Client } from 'discord.js';
import {
  bloomError,
  unsafeSnowflake,
  type ChannelId,
  type GuildId,
  type MessageId,
  type UserId,
} from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { BloomMessage } from '@bloom/embeds';
import type { MessagingService } from '../ports.js';
import { toChannelMessageOptions } from '../adapters/message.js';

export class DiscordMessagingService implements MessagingService {
  public constructor(
    private readonly client: Client,
    private readonly logger: Logger,
  ) {}

  public async sendToChannel(
    guildId: GuildId,
    channelId: ChannelId,
    message: BloomMessage,
  ): Promise<MessageId> {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      throw bloomError('GUILD_MISMATCH', {
        operatorHint: `Not connected to guild ${guildId}.`,
        details: { guild_id: guildId },
      });
    }

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      throw bloomError('CHANNEL_NOT_FOUND', {
        operatorHint: `Channel ${channelId} does not exist or the bot cannot see it. If the channel exists, the bot's role is missing View Channel on it — channel-level overwrites take precedence over server-level permissions.`,
        details: { channel_id: channelId },
      });
    }

    if (!channel.isTextBased()) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Channel ${channelId} ("${channel.name}") is not a text channel, but it is configured as a destination for bot messages.`,
        details: { channel_id: channelId, channel_type: channel.type },
      });
    }

    try {
      const sent = await channel.send(toChannelMessageOptions(message));
      return unsafeSnowflake<MessageId>(sent.id);
    } catch (error) {
      if (error instanceof DiscordAPIError && error.code === 50013) {
        throw bloomError('BOT_MISSING_PERMISSION', {
          operatorHint: `Cannot post in "${channel.name}" (${channelId}). The bot's role needs View Channel, Send Messages and Embed Links on that channel; check the channel's permission overwrites, not just the server-wide role.`,
          details: { channel_id: channelId, discord_code: 50013 },
          cause: error,
        });
      }
      throw error;
    }
  }

  /**
   * DM a member.
   *
   * Returns `false` when the DM cannot be delivered. Discord reports that as
   * 50007 "Cannot send messages to this user", and it means the member has
   * server DMs off, has blocked the bot, or shares no mutual server — none of
   * which are faults. Callers need to handle it: onboarding that depends on a
   * DM arriving will strand a meaningful share of members, so a channel-based
   * fallback is the design, not an afterthought.
   */
  public async sendDirectMessage(
    userId: UserId,
    message: BloomMessage,
  ): Promise<boolean> {
    try {
      const user = await this.client.users.fetch(userId);
      await user.send(toChannelMessageOptions(message));
      return true;
    } catch (error) {
      if (
        error instanceof DiscordAPIError &&
        (error.code === 50007 || error.code === 50033)
      ) {
        this.logger.debug(
          'dm.blocked',
          'Member does not accept direct messages from this server.',
          { context: { user_id: userId } },
        );
        return false;
      }
      throw error;
    }
  }
}
