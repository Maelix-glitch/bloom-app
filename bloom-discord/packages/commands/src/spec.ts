import type { DiscordPermissionName } from '@bloom/permissions';

/**
 * Application command definitions, as data.
 *
 * Same reasoning as the message DTOs: keeping the shape library-agnostic means
 * `packages/discord` owns the translation to whatever builder the current
 * discord.js exposes, and a builder API change does not ripple through every
 * feature. It also lets the registration script diff commands without
 * instantiating a client.
 */

export type CommandOptionType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'user'
  | 'role'
  | 'channel'
  | 'attachment';

export interface CommandOptionChoice {
  readonly name: string;
  readonly value: string | number;
}

export interface CommandOption {
  readonly name: string;
  readonly description: string;
  readonly type: CommandOptionType;
  readonly required?: boolean;
  readonly choices?: readonly CommandOptionChoice[];
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  /** Channel type ids to restrict a channel option to. */
  readonly channelTypes?: readonly number[];
  readonly autocomplete?: boolean;
}

export interface SubcommandSpec {
  readonly name: string;
  readonly description: string;
  readonly options?: readonly CommandOption[];
}

export interface SubcommandGroupSpec {
  readonly name: string;
  readonly description: string;
  readonly subcommands: readonly SubcommandSpec[];
}

/**
 * A top-level slash command.
 *
 * `defaultMemberPermissions` is the Discord-side gate: it hides the command in
 * the client for members who lack those permissions. It is a UX affordance and
 * an administrative convenience, never the security boundary — Discord lets
 * server administrators override it per role and per channel, so the real
 * decision is always the server-side policy on `BloomCommand`.
 *
 * `'none'` means "visible to nobody by default, administrators must grant it
 * explicitly", which is the right default for staff commands.
 */
export interface SlashCommandSpec {
  readonly name: string;
  readonly description: string;
  readonly options?: readonly CommandOption[];
  readonly subcommands?: readonly SubcommandSpec[];
  readonly groups?: readonly SubcommandGroupSpec[];
  readonly defaultMemberPermissions?: readonly DiscordPermissionName[] | 'none';
  /**
   * Every Bloom command is guild-only. Declared rather than assumed so the
   * registrar can set the interaction contexts explicitly — DM-installable
   * commands are a whole separate threat model we are not taking on.
   */
  readonly guildOnly: true;
}

export type ContextMenuTarget = 'user' | 'message';

export interface ContextMenuCommandSpec {
  readonly name: string;
  readonly target: ContextMenuTarget;
  readonly defaultMemberPermissions?: readonly DiscordPermissionName[] | 'none';
  readonly guildOnly: true;
}

export type CommandSpec = SlashCommandSpec | ContextMenuCommandSpec;

export function isSlashCommandSpec(spec: CommandSpec): spec is SlashCommandSpec {
  return 'description' in spec;
}
