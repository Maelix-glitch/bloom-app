import {
  ApplicationIntegrationType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type SlashCommandSubcommandBuilder,
  type SlashCommandSubcommandGroupBuilder,
  type SlashCommandAttachmentOption,
  type SlashCommandBooleanOption,
  type SlashCommandChannelOption,
  type SlashCommandIntegerOption,
  type SlashCommandNumberOption,
  type SlashCommandRoleOption,
  type SlashCommandStringOption,
  type SlashCommandUserOption,
  type RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js';
import { bloomError } from '@bloom/shared-types';
import type {
  CommandOption,
  CommandSpec,
  ContextMenuCommandSpec,
  SlashCommandSpec,
  SubcommandSpec,
} from '@bloom/commands';
import { isSlashCommandSpec } from '@bloom/commands';
import type { DiscordPermissionName } from '@bloom/permissions';

/**
 * Turn a Bloom command spec into the JSON Discord expects.
 *
 * Current-API notes, since this is exactly where stale material bites:
 *
 *   • `setContexts(InteractionContextType.Guild)` is how a command is made
 *     guild-only. `setDMPermission` is deprecated.
 *   • `setIntegrationTypes(ApplicationIntegrationType.GuildInstall)` states that
 *     these are server-installed commands, not user-installed ones. Omitting it
 *     leaves the behaviour to Discord's default, which is not something to leave
 *     implicit for a bot with moderation powers.
 *   • `setDefaultMemberPermissions(0n)` means "nobody by default, administrators
 *     grant it explicitly" — the right posture for staff commands, and not the
 *     same as omitting the call.
 */
export function toDiscordCommand(
  spec: CommandSpec,
): RESTPostAPIApplicationCommandsJSONBody {
  return isSlashCommandSpec(spec) ? toSlashCommand(spec) : toContextMenuCommand(spec);
}

function toSlashCommand(spec: SlashCommandSpec): RESTPostAPIApplicationCommandsJSONBody {
  const builder = new SlashCommandBuilder()
    .setName(spec.name)
    .setDescription(spec.description)
    .setContexts(InteractionContextType.Guild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall);

  applyDefaultPermissions(builder, spec.defaultMemberPermissions);

  // Discord forbids mixing top-level options with subcommands. Catching it here
  // gives a clear error instead of a 400 from the registration endpoint.
  const hasSubcommands =
    (spec.subcommands?.length ?? 0) > 0 || (spec.groups?.length ?? 0) > 0;
  if (hasSubcommands && (spec.options?.length ?? 0) > 0) {
    throw bloomError('CONFIGURATION_ERROR', {
      operatorHint: `Command "/${spec.name}" declares both top-level options and subcommands. Discord allows one or the other. Move the options onto each subcommand.`,
      details: { command: spec.name },
    });
  }

  for (const option of spec.options ?? []) {
    applyOption(builder, option);
  }

  for (const subcommand of spec.subcommands ?? []) {
    builder.addSubcommand((sub) => buildSubcommand(sub, subcommand));
  }

  for (const group of spec.groups ?? []) {
    builder.addSubcommandGroup((groupBuilder: SlashCommandSubcommandGroupBuilder) => {
      groupBuilder.setName(group.name).setDescription(group.description);
      for (const subcommand of group.subcommands) {
        groupBuilder.addSubcommand((sub) => buildSubcommand(sub, subcommand));
      }
      return groupBuilder;
    });
  }

  return builder.toJSON();
}

function toContextMenuCommand(
  spec: ContextMenuCommandSpec,
): RESTPostAPIApplicationCommandsJSONBody {
  const builder = new ContextMenuCommandBuilder()
    .setName(spec.name)
    .setType(spec.target === 'user' ? 2 : 3)
    .setContexts(InteractionContextType.Guild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall);

  applyDefaultPermissions(builder, spec.defaultMemberPermissions);
  return builder.toJSON();
}

interface PermissionCapableBuilder {
  setDefaultMemberPermissions(permissions: bigint | number | null | undefined): unknown;
}

function applyDefaultPermissions(
  builder: PermissionCapableBuilder,
  permissions: readonly DiscordPermissionName[] | 'none' | undefined,
): void {
  if (permissions === undefined) return;

  if (permissions === 'none') {
    // Hidden from everyone until an administrator grants it per role/channel.
    builder.setDefaultMemberPermissions(0n);
    return;
  }

  const bits = permissions.reduce(
    (accumulator, name) => accumulator | PermissionFlagsBits[name],
    0n,
  );
  builder.setDefaultMemberPermissions(bits);
}

function buildSubcommand(
  builder: SlashCommandSubcommandBuilder,
  spec: SubcommandSpec,
): SlashCommandSubcommandBuilder {
  builder.setName(spec.name).setDescription(spec.description);
  for (const option of spec.options ?? []) {
    applyOption(builder, option);
  }
  return builder;
}

/**
 * Attach one option.
 *
 * The `addXOption` methods exist on both the top-level and subcommand builders
 * with the same shapes, so this works for either — hence the structural type
 * rather than a union of the two builder classes.
 */
interface OptionCapableBuilder {
  addStringOption(
    fn: (input: SlashCommandStringOption) => SlashCommandStringOption,
  ): unknown;
  addIntegerOption(
    fn: (input: SlashCommandIntegerOption) => SlashCommandIntegerOption,
  ): unknown;
  addNumberOption(
    fn: (input: SlashCommandNumberOption) => SlashCommandNumberOption,
  ): unknown;
  addBooleanOption(
    fn: (input: SlashCommandBooleanOption) => SlashCommandBooleanOption,
  ): unknown;
  addUserOption(fn: (input: SlashCommandUserOption) => SlashCommandUserOption): unknown;
  addRoleOption(fn: (input: SlashCommandRoleOption) => SlashCommandRoleOption): unknown;
  addChannelOption(
    fn: (input: SlashCommandChannelOption) => SlashCommandChannelOption,
  ): unknown;
  addAttachmentOption(
    fn: (input: SlashCommandAttachmentOption) => SlashCommandAttachmentOption,
  ): unknown;
}

function applyOption(builder: OptionCapableBuilder, option: CommandOption): void {
  const required = option.required ?? false;

  switch (option.type) {
    case 'string':
      builder.addStringOption((input) => {
        input
          .setName(option.name)
          .setDescription(option.description)
          .setRequired(required);
        if (option.minLength !== undefined) input.setMinLength(option.minLength);
        if (option.maxLength !== undefined) input.setMaxLength(option.maxLength);
        if (option.autocomplete === true) input.setAutocomplete(true);
        else if (option.choices) {
          input.addChoices(
            ...option.choices.map((choice) => ({
              name: choice.name,
              value: String(choice.value),
            })),
          );
        }
        return input;
      });
      return;

    case 'integer':
      builder.addIntegerOption((input) => {
        input
          .setName(option.name)
          .setDescription(option.description)
          .setRequired(required);
        if (option.minValue !== undefined) input.setMinValue(option.minValue);
        if (option.maxValue !== undefined) input.setMaxValue(option.maxValue);
        if (option.autocomplete === true) input.setAutocomplete(true);
        else if (option.choices) {
          input.addChoices(
            ...option.choices.map((choice) => ({
              name: choice.name,
              value: Number(choice.value),
            })),
          );
        }
        return input;
      });
      return;

    case 'number':
      builder.addNumberOption((input) => {
        input
          .setName(option.name)
          .setDescription(option.description)
          .setRequired(required);
        if (option.minValue !== undefined) input.setMinValue(option.minValue);
        if (option.maxValue !== undefined) input.setMaxValue(option.maxValue);
        return input;
      });
      return;

    case 'boolean':
      builder.addBooleanOption((input) =>
        input
          .setName(option.name)
          .setDescription(option.description)
          .setRequired(required),
      );
      return;

    case 'user':
      builder.addUserOption((input) =>
        input
          .setName(option.name)
          .setDescription(option.description)
          .setRequired(required),
      );
      return;

    case 'role':
      builder.addRoleOption((input) =>
        input
          .setName(option.name)
          .setDescription(option.description)
          .setRequired(required),
      );
      return;

    case 'channel':
      builder.addChannelOption((input) => {
        input
          .setName(option.name)
          .setDescription(option.description)
          .setRequired(required);
        return input;
      });
      return;

    case 'attachment':
      builder.addAttachmentOption((input) =>
        input
          .setName(option.name)
          .setDescription(option.description)
          .setRequired(required),
      );
      return;
  }
}
