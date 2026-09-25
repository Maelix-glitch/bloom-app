import { describe, expect, it } from 'vitest';
import { CommandRegistry, RESERVED_TOP_LEVEL } from '@bloom/commands';
import { toDiscordCommand } from '@bloom/discord';
import type { GuardianDeps } from './deps.js';
import {
  guardianCommands,
  guardianCommandSpecs,
  guardianNamespaceCommand,
} from './commands.js';

/**
 * The registration contract.
 *
 * Two lists have to agree: what Discord is told exists, and what the dispatcher
 * can route. When they drift, a member gets "This interaction failed" with no
 * explanation and nothing in the logs — so the agreement is asserted rather
 * than assumed.
 */

describe('Guardian command set', () => {
  it('registers without collisions', () => {
    const registry = new CommandRegistry<GuardianDeps>('guardian');
    expect(() => registry.registerAll(guardianCommands)).not.toThrow();
    expect(registry.size).toBe(guardianCommands.length);
  });

  it('publishes exactly the commands it can route', () => {
    const registry = new CommandRegistry<GuardianDeps>('guardian').registerAll(
      guardianCommands,
    );

    for (const spec of guardianCommandSpecs) {
      expect(registry.get(spec.name)).toBeDefined();
    }
    expect(guardianCommandSpecs).toHaveLength(registry.size);
  });

  it('claims only names reserved for Guardian', () => {
    for (const spec of guardianCommandSpecs) {
      expect(RESERVED_TOP_LEVEL.guardian).toContain(spec.name);
      expect(RESERVED_TOP_LEVEL.companion).not.toContain(spec.name);
      expect(RESERVED_TOP_LEVEL.labs).not.toContain(spec.name);
    }
  });

  /**
   * Building the real discord.js payload is the only way to catch a spec
   * Discord would reject — description length, option ordering, an empty
   * subcommand group. Those failures otherwise appear at registration time,
   * against a live application, which is a bad place to discover them.
   */
  it('converts to a valid Discord payload', () => {
    for (const spec of guardianCommandSpecs) {
      expect(() => toDiscordCommand(spec)).not.toThrow();
    }
  });

  it('declares every command guild-only', () => {
    for (const command of guardianCommands) {
      expect(command.spec.guildOnly).toBe(true);
    }
  });

  it('defers every command, because all of them touch the database', () => {
    for (const command of guardianCommands) {
      expect(command.defer).toBe(true);
    }
  });

  /**
   * `defaultMemberPermissions` is a client-side hint an administrator can
   * override, never the boundary — but getting it wrong is still a real
   * problem in both directions. Hiding `/verify` would strand the members who
   * most need it; showing `/guardian` to everyone invites a stream of denied
   * attempts and tells outsiders the staff surface exists.
   */
  it('hides staff commands by default but leaves member commands visible', () => {
    const byName = new Map(guardianCommands.map((c) => [c.spec.name, c]));

    expect(byName.get('verify')?.spec.defaultMemberPermissions).toBeUndefined();
    expect(byName.get('report')?.spec.defaultMemberPermissions).toBeUndefined();
    expect(byName.get('guardian')?.spec.defaultMemberPermissions).toBe('none');
    expect(byName.get('ban')?.spec.defaultMemberPermissions).toBe('none');
  });

  /**
   * Discord allows at most 25 options on a command and 25 subcommands in a
   * group. `/guardian` is assembled from every feature's contributions, so it
   * is the one command that grows without anybody watching it — and the
   * failure mode is a 400 from the registration script, after a deploy.
   */
  it('keeps /guardian within Discord\'s subcommand limits', () => {
    const spec = guardianNamespaceCommand.spec;
    const groups = spec.groups ?? [];
    const bare = spec.subcommands ?? [];

    expect(groups.length + bare.length).toBeLessThanOrEqual(25);
    for (const group of groups) {
      expect(group.subcommands.length).toBeLessThanOrEqual(25);
    }
  });

  /**
   * Both features contribute to `/guardian`. If either stops arriving — a
   * refactor drops an export, a list is rebuilt from the wrong source — the
   * command still registers and still works, just missing half its branches.
   * Nothing else in the suite would notice.
   */
  it('assembles /guardian from every contributing feature', () => {
    const groups = (guardianNamespaceCommand.spec.groups ?? []).map((g) => g.name);

    // Onboarding.
    expect(groups).toContain('onboarding');
    expect(groups).toContain('roles');
    // Moderation.
    expect(groups).toContain('case');
    expect(groups).toContain('member');
    expect(groups).toContain('channel');
  });

  it('keeps every command inside the guild', () => {
    for (const spec of guardianCommandSpecs) {
      const json = toDiscordCommand(spec) as {
        contexts?: readonly number[];
        integration_types?: readonly number[];
      };
      // InteractionContextType.Guild === 0, ApplicationIntegrationType.GuildInstall === 0.
      expect(json.contexts).toEqual([0]);
      expect(json.integration_types).toEqual([0]);
    }
  });
});
