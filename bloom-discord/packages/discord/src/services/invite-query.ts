import { DiscordAPIError, PermissionsBitField, type Client } from 'discord.js';
import { unsafeSnowflake, type GuildId, type UserId } from '@bloom/shared-types';
import type { InviteQueryService, InviteUsageSnapshot } from '../ports.js';

/**
 * Reading invite use counts, backed by discord.js.
 *
 * Deliberately tolerant. Every failure mode here — missing permission, a
 * Discord outage, a guild the bot was removed from — returns `null` rather
 * than throwing, because the caller's correct response to all of them is
 * identical: record the join as unattributed and move on. A member joining
 * must never fail because invite bookkeeping did.
 *
 * Note what is not cached here: nothing. This service reads, and the caller
 * owns the before/after snapshots. Keeping the cache out of the Discord
 * adapter is what lets the attribution logic be a pure function with no
 * discord.js anywhere near it.
 */
export class DiscordInviteQueryService implements InviteQueryService {
  public constructor(private readonly client: Client) {}

  public async readUsage(guildId: GuildId): Promise<InviteUsageSnapshot | null> {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return null;

    /*
     * Checked before the call rather than catching the 50013 afterwards.
     *
     * Manage Guild is the permission Discord requires to list invites. If it
     * is missing the right outcome is "attribution unavailable", and asking
     * first means that outcome costs nothing instead of a round trip and an
     * error log on every single join.
     */
    const self = guild.members.me;
    if (!self?.permissions.has(PermissionsBitField.Flags.ManageGuild)) return null;

    try {
      const invites = await guild.invites.fetch();

      return {
        invites: invites.map((invite) => ({
          code: invite.code,
          uses: invite.uses ?? 0,
          inviterId: invite.inviter ? unsafeSnowflake<UserId>(invite.inviter.id) : null,
          inviterIsBot: invite.inviter?.bot ?? false,
        })),
        vanityUses: await this.vanityUses(guild),
      };
    } catch (error) {
      if (error instanceof DiscordAPIError) return null;
      throw error;
    }
  }

  /**
   * The vanity URL's use count, when the guild has one.
   *
   * Separate from the invite list in Discord's API, and absent entirely for
   * guilds without the feature. A failure here is not a failure of the whole
   * read — it only means vanity joins cannot be distinguished from unknown
   * ones, so it degrades to `null`.
   */
  private async vanityUses(
    guild: NonNullable<ReturnType<Client['guilds']['cache']['get']>>,
  ): Promise<number | null> {
    if (!guild.features.includes('VANITY_URL')) return null;

    try {
      const vanity = await guild.fetchVanityData();
      return vanity.uses;
    } catch {
      return null;
    }
  }
}
