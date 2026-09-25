import { describe, expect, it } from 'vitest';
import {
  CommandRegistry,
  customIdRoute,
  isSlashCommandSpec,
  parseCustomId,
  RESERVED_TOP_LEVEL,
  shouldDefer,
} from '@bloom/commands';
import { toDiscordCommand } from '@bloom/discord';
import { fakeInvocation } from '@bloom/testing';
import type { LabsDeps } from './deps.js';
import { labsCommands, labsCommandSpecs, labsNamespaceCommand } from './commands.js';
import { intakeModalHandlers } from './features/intake/handlers.js';

/**
 * The registration contract, for the third bot.
 *
 * Same agreement as Guardian's and Companion's — what Discord is told exists
 * must be what the dispatcher can route — plus one that only Labs needs: every
 * modal this bot opens must have a handler registered for the id it carries.
 */

describe('Labs command set', () => {
  it('registers without collisions', () => {
    const registry = new CommandRegistry<LabsDeps>('labs');
    expect(() => registry.registerAll(labsCommands)).not.toThrow();
    expect(registry.size).toBe(labsCommands.length);
  });

  it('claims only names reserved to Labs', () => {
    for (const spec of labsCommandSpecs) {
      expect(RESERVED_TOP_LEVEL.labs).toContain(spec.name);
    }
  });

  it('converts cleanly to Discord’s payload shape', () => {
    for (const spec of labsCommandSpecs) {
      expect(() => toDiscordCommand(spec)).not.toThrow();
    }
  });

  it('defers everything except the branches that open a form', () => {
    /*
     * A modal must be the initial response to an interaction, so a branch that
     * shows one cannot defer first. Everything else touches the database and
     * must, because the acknowledgement budget is three seconds.
     */
    const opensAForm = new Set(['feedback', 'report']);

    for (const command of labsCommands) {
      const { invocation } = fakeInvocation({ commandName: command.spec.name });
      expect(shouldDefer(command, invocation)).toBe(!opensAForm.has(command.spec.name));
    }

    const spec = labsNamespaceCommand.spec;
    const bug = isSlashCommandSpec(spec)
      ? spec.groups?.find((group) => group.name === 'bug')
      : undefined;

    for (const subcommand of bug?.subcommands ?? []) {
      const { invocation } = fakeInvocation({
        commandName: 'labs',
        subcommandGroup: 'bug',
        subcommand: subcommand.name,
      });
      expect(shouldDefer(labsNamespaceCommand, invocation)).toBe(
        !opensAForm.has(subcommand.name),
      );
    }
  });

  it('has a handler for every modal it can open', () => {
    /*
     * The failure this prevents is specific and silent: a member fills in a
     * form, presses submit, and nothing happens — because the id the modal
     * carries routes nowhere. Nothing else in the type system connects the two.
     */
    const routes = new Set(
      intakeModalHandlers.map(
        (handler) => `${handler.bot}:${handler.feature}:${handler.action}`,
      ),
    );

    for (const customId of ['labs:feedback:submit:feature', 'labs:bug:submit:app']) {
      const parsed = parseCustomId(customId);
      expect(parsed).not.toBeNull();
      if (!parsed) continue;
      expect(routes).toContain(customIdRoute(parsed));
    }
  });

  it('keeps the staff surface inside the member-gated namespace', () => {
    const spec = labsNamespaceCommand.spec;
    expect(isSlashCommandSpec(spec)).toBe(true);
    if (!isSlashCommandSpec(spec)) return;

    // Both groups are visible to any member; the branches under `admin` refuse
    // on their own policy. Discord cannot express per-subcommand permissions,
    // so this is the same trust model as everywhere else: the client-side hint
    // is a hint, and the server-side check is the boundary.
    expect(spec.groups?.map((group) => group.name).sort()).toEqual(['admin', 'bug']);
  });
});
