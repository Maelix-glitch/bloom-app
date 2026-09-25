import { DiscordAPIError, type Client } from 'discord.js';
import {
  bloomError,
  unsafeSnowflake,
  type BotName,
  type GuildId,
  type RoleId,
  type UserId,
} from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { PlatformConfig } from '@bloom/config';
import {
  assertCapability,
  checkRoleManageable,
  describeHierarchyFix,
  isRoleWritePermitted,
  type BotRoleContext,
} from '@bloom/permissions';
import { sanitiseReason } from '@bloom/security';
import type { GuildQueryService, RoleService } from '../ports.js';

/**
 * Role assignment. Guardian only.
 *
 * Four gates stand between a call and a role change, and they are deliberately
 * redundant — the brief treats role management as the highest-risk thing the
 * platform does:
 *
 *   1. **Capability.** The constructor throws unless the bot declares
 *      `role:write`. Wiring this into Companion fails at boot, not at runtime.
 *   2. **Allow-list.** Only the two roles Guardian owns — Early Bloom and Bloom
 *      Member — can be written, whatever role id is passed in. A bug that
 *      passes the Moderator role id gets a refusal, not a privilege escalation.
 *   3. **Hierarchy.** Live positions are re-read before every write and checked
 *      against the bot's own. Role positions change without notice.
 *   4. **Idempotency.** A member who already holds the role is a success.
 */
export class DiscordRoleService implements RoleService {
  public constructor(
    private readonly client: Client,
    private readonly guilds: GuildQueryService,
    private readonly config: PlatformConfig,
    private readonly logger: Logger,
    bot: BotName,
  ) {
    assertCapability(bot, 'role:write');
  }

  public async assignRole(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly roleId: RoleId;
    readonly reason: string;
  }): Promise<void> {
    await this.mutate('add', input);
  }

  public async removeRole(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly roleId: RoleId;
    readonly reason: string;
  }): Promise<void> {
    await this.mutate('remove', input);
  }

  private async mutate(
    action: 'add' | 'remove',
    input: {
      readonly guildId: GuildId;
      readonly userId: UserId;
      readonly roleId: RoleId;
      readonly reason: string;
    },
  ): Promise<void> {
    // Gate 2: allow-list, before anything is fetched. The refusal it returns
    // already names the offending role, so it is rethrown as-is.
    const permitted = isRoleWritePermitted(this.config, input.roleId);
    if (!permitted.ok) throw permitted.error;

    const guild = this.client.guilds.cache.get(input.guildId);
    if (!guild) {
      throw bloomError('GUILD_MISMATCH', {
        operatorHint: `Not connected to guild ${input.guildId}.`,
        details: { guild_id: input.guildId },
      });
    }

    // Gate 3: hierarchy, against positions read now rather than at startup.
    const [self, role] = await Promise.all([
      this.guilds.getSelf(input.guildId),
      this.guilds.getRole(input.guildId, input.roleId),
    ]);

    if (!role) {
      throw bloomError('ROLE_NOT_FOUND', {
        operatorHint: `Role ${input.roleId} does not exist in this server. It was probably deleted after being configured; update the role id in the environment.`,
        details: { role_id: input.roleId },
      });
    }

    const botContext: BotRoleContext = {
      highestRolePosition: self.highestRolePosition,
      highestRoleName: self.highestRoleName,
      permissions: self.permissions,
    };

    const manageable = checkRoleManageable(botContext, role);
    if (!manageable.ok) {
      this.logger.error(
        'role.hierarchy_blocked',
        describeHierarchyFix(botContext, role),
        { error: manageable.error, error_code: manageable.error.code },
      );
      throw manageable.error;
    }

    const member = await guild.members.fetch(input.userId).catch(() => null);
    if (!member) {
      throw bloomError('MEMBER_NOT_FOUND', {
        operatorHint: `Member ${input.userId} is not in the server. They may have left between the trigger and this write.`,
        details: { user_id: input.userId },
      });
    }

    // Gate 4: idempotency. Re-adding a held role is a no-op, not an error, and
    // not an audit-log entry either.
    const holdsRole = member.roles.cache.has(input.roleId);
    if ((action === 'add' && holdsRole) || (action === 'remove' && !holdsRole)) {
      this.logger.debug(
        'role.noop',
        `Member already in the requested state for role "${role.name}"; nothing to do.`,
        { context: { role_id: input.roleId, action } },
      );
      return;
    }

    const reason = sanitiseReason(input.reason);

    try {
      if (action === 'add') {
        await member.roles.add(input.roleId, reason);
      } else {
        await member.roles.remove(input.roleId, reason);
      }
    } catch (error) {
      throw translateRoleError(error, role.name, unsafeSnowflake<RoleId>(role.id));
    }

    this.logger.info(
      `role.${action}`,
      `${action === 'add' ? 'Assigned' : 'Removed'} role "${role.name}".`,
      { context: { role_id: input.roleId, role_name: role.name, reason } },
    );
  }
}

/**
 * Turn a Discord API error into something an admin can act on.
 *
 * 50013 "Missing Permissions" is the one that matters. Discord returns it both
 * for "you lack Manage Roles" and for "the target role is above you", with no
 * way to tell which — so the message has to name both possibilities rather than
 * guess.
 */
function translateRoleError(error: unknown, roleName: string, roleId: RoleId): unknown {
  if (!(error instanceof DiscordAPIError)) return error;

  switch (error.code) {
    case 50013:
      return bloomError('ROLE_HIERARCHY_BLOCKED', {
        operatorHint: `Discord refused the change to "${roleName}" (${roleId}) with "Missing Permissions". Either the Bloom Bot role is not above "${roleName}" in Server Settings → Roles, or it does not have the Manage Roles permission. Check the ordering first — it is the usual cause, and it changes whenever someone reorders roles.`,
        details: { role_id: roleId, role_name: roleName, discord_code: 50013 },
        cause: error,
      });

    case 10011:
      return bloomError('ROLE_NOT_FOUND', {
        operatorHint: `Role "${roleName}" (${roleId}) no longer exists. Update the configured role id.`,
        details: { role_id: roleId },
        cause: error,
      });

    case 10007:
      return bloomError('MEMBER_NOT_FOUND', {
        operatorHint:
          'The member left the server before the role change could be applied.',
        cause: error,
      });

    default:
      return bloomError('DISCORD_API_ERROR', {
        operatorHint: `Discord returned ${String(error.code)} (${error.message}) while changing role "${roleName}".`,
        details: { role_id: roleId, discord_code: error.code },
        cause: error,
      });
  }
}
