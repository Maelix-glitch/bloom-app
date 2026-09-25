import {
  DiscordAPIError,
  PermissionFlagsBits,
  type Client,
  type Guild,
} from 'discord.js';
import { bloomError, type BotName, type GuildId, type UserId } from '@bloom/shared-types';
import { MAX_TIMEOUT_MS } from '@bloom/utils';
import type { Logger } from '@bloom/logging';
import { assertCapability } from '@bloom/permissions';
import { sanitiseReason } from '@bloom/security';
import type { ModerationService } from '../ports.js';

/**
 * Member moderation against the live Discord API. Guardian only.
 *
 * The capability assertion in the constructor is the same pattern as
 * `DiscordRoleService`: a wiring mistake that handed this to Companion would
 * fail at boot rather than the first time somebody ran `/ban`.
 *
 * Nothing here decides *whether* an action is allowed. Target protection,
 * hierarchy and the moderator's own authority are settled in
 * `@bloom/permissions` before a call reaches this class — this is the layer
 * that performs an already-authorised action and translates Discord's failures
 * into something an administrator can act on.
 */
export class DiscordModerationService implements ModerationService {
  public constructor(
    private readonly client: Client,
    private readonly logger: Logger,
    bot: BotName,
  ) {
    assertCapability(bot, 'moderation:execute');
  }

  private async guild(guildId: GuildId): Promise<Guild> {
    const guild = await this.client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      throw bloomError('GUILD_MISMATCH', {
        operatorHint: `Guardian is not in guild ${guildId}, or the gateway has not finished loading it.`,
        details: { guild_id: guildId },
      });
    }
    return guild;
  }

  public async timeoutMember(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly until: Date;
    readonly reason: string;
  }): Promise<void> {
    const durationMs = input.until.getTime() - Date.now();

    /*
     * Discord caps timeouts at 28 days and rejects anything longer with a
     * validation error. Refusing here means the moderator is told the limit,
     * rather than shown a generic API failure after the command has already
     * been recorded as attempted.
     */
    if (durationMs > MAX_TIMEOUT_MS) {
      throw bloomError('INVALID_INPUT', {
        userMessage: 'Timeouts cannot be longer than 28 days.',
        details: { requested_ms: durationMs, maximum_ms: MAX_TIMEOUT_MS },
      });
    }
    if (durationMs <= 0) {
      throw bloomError('INVALID_INPUT', {
        userMessage: 'That timeout would end in the past.',
        details: { requested_ms: durationMs },
      });
    }

    const guild = await this.guild(input.guildId);
    const member = await guild.members.fetch(input.userId).catch(() => null);
    if (!member) throw memberGone(input.userId);

    try {
      await member.timeout(durationMs, sanitiseReason(input.reason));
    } catch (error) {
      throw translate(error, 'timeout');
    }

    this.logger.info('moderation.timeout', 'Applied a timeout.', {
      context: { user_id: input.userId, until: input.until.toISOString() },
    });
  }

  public async removeTimeout(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly reason: string;
  }): Promise<void> {
    const guild = await this.guild(input.guildId);
    const member = await guild.members.fetch(input.userId).catch(() => null);
    if (!member) throw memberGone(input.userId);

    try {
      await member.timeout(null, sanitiseReason(input.reason));
    } catch (error) {
      throw translate(error, 'untimeout');
    }

    this.logger.info('moderation.untimeout', 'Lifted a timeout.', {
      context: { user_id: input.userId },
    });
  }

  public async kickMember(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly reason: string;
  }): Promise<void> {
    const guild = await this.guild(input.guildId);
    const member = await guild.members.fetch(input.userId).catch(() => null);
    if (!member) throw memberGone(input.userId);

    try {
      await member.kick(sanitiseReason(input.reason));
    } catch (error) {
      throw translate(error, 'kick');
    }

    this.logger.info('moderation.kick', 'Removed a member.', {
      context: { user_id: input.userId },
    });
  }

  public async banMember(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly reason: string;
    readonly deleteMessageSeconds?: number;
  }): Promise<void> {
    const guild = await this.guild(input.guildId);

    /*
     * Bans go through `guild.bans.create`, not through a fetched member.
     * Banning a user id that never joined is a legitimate and important
     * workflow — it is how a known raider is kept out ahead of time — and
     * fetching the member first would break it.
     */
    try {
      await guild.bans.create(input.userId, {
        reason: sanitiseReason(input.reason),
        ...(input.deleteMessageSeconds === undefined
          ? {}
          : { deleteMessageSeconds: input.deleteMessageSeconds }),
      });
    } catch (error) {
      throw translate(error, 'ban');
    }

    this.logger.info('moderation.ban', 'Banned a user.', {
      context: {
        user_id: input.userId,
        delete_message_seconds: input.deleteMessageSeconds ?? 0,
      },
    });
  }

  public async unbanMember(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly reason: string;
  }): Promise<boolean> {
    const guild = await this.guild(input.guildId);

    try {
      await guild.bans.remove(input.userId, sanitiseReason(input.reason));
    } catch (error) {
      /*
       * 10026 "Unknown Ban" means they were not banned. That is a no-op rather
       * than a failure: the desired end state — this user is not banned — is
       * already true, and reporting an error would send a moderator looking for
       * a problem that does not exist.
       */
      if (error instanceof DiscordAPIError && error.code === 10026) {
        this.logger.debug('moderation.unban_noop', 'User was not banned.', {
          context: { user_id: input.userId },
        });
        return false;
      }
      throw translate(error, 'unban');
    }

    this.logger.info('moderation.unban', 'Lifted a ban.', {
      context: { user_id: input.userId },
    });
    return true;
  }
}

function memberGone(userId: UserId): unknown {
  return bloomError('MEMBER_NOT_FOUND', {
    userMessage: 'That member is no longer in this server.',
    details: { user_id: userId },
  });
}

/**
 * Discord failures, translated.
 *
 * 50013 is the important one and is genuinely ambiguous: Discord returns it
 * both for "the bot lacks the permission" and for "the target outranks the
 * bot". The hint names both, because guessing one and being wrong sends an
 * administrator to the wrong settings page.
 */
function translate(error: unknown, action: string): unknown {
  if (!(error instanceof DiscordAPIError)) return error;

  switch (error.code) {
    case 50013:
      return bloomError('ROLE_HIERARCHY_BLOCKED', {
        userMessage: 'Bloom could not complete that action.',
        operatorHint:
          `Discord refused "${action}" with "Missing Permissions". Either the ◉ Bloom Bot role sits below the target's highest role in Server Settings → Roles, ` +
          'or Guardian is missing the permission for this action. Check the role ordering first — it is the usual cause and it changes whenever someone reorders roles.',
        details: { action, discord_code: 50013 },
        cause: error,
      });

    case 10007:
      return bloomError('MEMBER_NOT_FOUND', {
        userMessage: 'That member is no longer in this server.',
        operatorHint: 'The member left between the command and the API call.',
        cause: error,
      });

    case 10013:
      return bloomError('MEMBER_NOT_FOUND', {
        userMessage: 'That user does not exist.',
        operatorHint: `Discord reported "Unknown User" for "${action}". The id is wrong, or the account was deleted.`,
        cause: error,
      });

    case 30035:
      return bloomError('INVALID_INPUT', {
        userMessage: 'That ban could not be added — the server has hit its ban limit.',
        operatorHint:
          'Discord returned 30035 "Maximum number of bans for non-guild members have been exceeded".',
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

/** Exported for the permission matrix doc and the startup self-check. */
export const MODERATION_PERMISSION_BITS = {
  timeout: PermissionFlagsBits.ModerateMembers,
  kick: PermissionFlagsBits.KickMembers,
  ban: PermissionFlagsBits.BanMembers,
} as const;
