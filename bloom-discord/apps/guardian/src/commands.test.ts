import { describe, expect, it } from 'vitest';
import { CommandRegistry, RESERVED_TOP_LEVEL } from '@bloom/commands';
import { toDiscordCommand } from '@bloom/discord';
import type { GuardianDeps } from './deps.js';
import { guardianCommands, guardianCommandSpecs } from './commands.js';

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
