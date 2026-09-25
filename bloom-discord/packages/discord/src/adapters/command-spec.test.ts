import { describe, expect, it } from 'vitest';
import { ApplicationCommandOptionType } from 'discord.js';
import type { SlashCommandSpec } from '@bloom/commands';
import { toDiscordCommand } from './command-spec.js';

/**
 * These tests pin the current-API behaviours that stale tutorials get wrong.
 * If a discord.js upgrade changes how contexts or integration types are
 * emitted, this is where it surfaces — in one file, rather than as a runtime
 * 400 during a deploy.
 */
describe('toDiscordCommand', () => {
  const base: SlashCommandSpec = {
    name: 'guardian',
    description: 'Guardian commands.',
    guildOnly: true,
  };

  it('emits name and description', () => {
    const json = toDiscordCommand(base);
    expect(json.name).toBe('guardian');
    expect('description' in json ? json.description : '').toBe('Guardian commands.');
  });

  /*
   * `contexts: [Guild]` is the modern replacement for `dm_permission: false`.
   * A moderation command reachable in DMs is a command with no guild context to
   * authorize against.
   */
  it('marks the command guild-only via contexts', () => {
    expect(toDiscordCommand(base).contexts).toEqual([0]);
  });

  it('declares guild install only', () => {
    expect(toDiscordCommand(base).integration_types).toEqual([0]);
  });

  /*
   * '0' is "visible to nobody by default". Omitting the field entirely means
   * "visible to everybody", so the distinction is load-bearing for staff
   * commands.
   */
  it("maps 'none' to a zero permission mask", () => {
    const json = toDiscordCommand({ ...base, defaultMemberPermissions: 'none' });
    expect(json.default_member_permissions).toBe('0');
  });

  it('maps named permissions to their bit mask', () => {
    const json = toDiscordCommand({
      ...base,
      defaultMemberPermissions: ['ModerateMembers'],
    });

    // ModerateMembers is 1 << 40. Permissions serialise as strings in API v8+.
    expect(json.default_member_permissions).toBe('1099511627776');
  });

  it('omits the permission field when nothing is declared', () => {
    expect(toDiscordCommand(base).default_member_permissions).toBeUndefined();
  });

  it('emits options with their types and requiredness', () => {
    const json = toDiscordCommand({
      ...base,
      options: [
        { name: 'member', description: 'Who.', type: 'user', required: true },
        { name: 'reason', description: 'Why.', type: 'string', maxLength: 512 },
      ],
    });

    const options = 'options' in json ? (json.options ?? []) : [];
    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({ name: 'member', type: 6, required: true });
    expect(options[1]).toMatchObject({ name: 'reason', type: 3, max_length: 512 });
  });

  it('emits subcommands', () => {
    const json = toDiscordCommand({
      ...base,
      subcommands: [
        { name: 'status', description: 'Show status.' },
        {
          name: 'reset',
          description: 'Reset it.',
          options: [
            { name: 'member', description: 'Who.', type: 'user', required: true },
          ],
        },
      ],
    });

    const options = 'options' in json ? (json.options ?? []) : [];
    expect(options.map((option) => option.name)).toEqual(['status', 'reset']);
    expect(
      options.every((option) => option.type === ApplicationCommandOptionType.Subcommand),
    ).toBe(true);
  });

  it('emits subcommand groups', () => {
    const json = toDiscordCommand({
      ...base,
      groups: [
        {
          name: 'roles',
          description: 'Role tools.',
          subcommands: [{ name: 'audit', description: 'Audit placement.' }],
        },
      ],
    });

    const options = 'options' in json ? (json.options ?? []) : [];
    expect(options[0]).toMatchObject({
      name: 'roles',
      type: ApplicationCommandOptionType.SubcommandGroup,
    });
  });

  /*
   * Discord rejects a command carrying both, but only at registration time —
   * by which point the deploy is already half done. Catching it locally turns a
   * remote 400 into a readable message.
   */
  it('refuses a command mixing top-level options with subcommands', () => {
    expect(() =>
      toDiscordCommand({
        ...base,
        options: [{ name: 'x', description: 'x', type: 'string' }],
        subcommands: [{ name: 'y', description: 'y' }],
      }),
    ).toThrow(/one or the other/i);
  });

  it('rejects an invalid command name at build time', () => {
    expect(() => toDiscordCommand({ ...base, name: 'Guardian Commands' })).toThrow();
  });

  it('emits string choices', () => {
    const json = toDiscordCommand({
      ...base,
      options: [
        {
          name: 'severity',
          description: 'How bad.',
          type: 'string',
          choices: [
            { name: 'Low', value: 'low' },
            { name: 'High', value: 'high' },
          ],
        },
      ],
    });

    const options = 'options' in json ? (json.options ?? []) : [];
    expect(options[0]).toMatchObject({
      choices: [
        { name: 'Low', value: 'low' },
        { name: 'High', value: 'high' },
      ],
    });
  });

  it('builds a user context-menu command', () => {
    const json = toDiscordCommand({
      name: 'Report to staff',
      target: 'user',
      guildOnly: true,
    });

    expect(json.name).toBe('Report to staff');
    // Type 2 is USER context menu.
    expect(json.type).toBe(2);
    expect(json.contexts).toEqual([0]);
  });

  it('builds a message context-menu command', () => {
    const json = toDiscordCommand({
      name: 'Report message',
      target: 'message',
      guildOnly: true,
    });
    // Type 3 is MESSAGE context menu.
    expect(json.type).toBe(3);
  });
});
