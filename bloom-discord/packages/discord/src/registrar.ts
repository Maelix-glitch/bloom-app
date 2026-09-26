import { createHash } from 'node:crypto';
import { REST, Routes, type RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { bloomError, type BotName, type GuildId } from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { CommandSpec } from '@bloom/commands';
import { toDiscordCommand } from './adapters/command-spec.js';

export type RegistrationScope = 'guild' | 'global';

export interface RegistrarOptions {
  readonly bot: BotName;
  readonly token: string;
  readonly clientId: string;
  readonly guildId: GuildId;
  readonly logger: Logger;
}

export interface RegistrationPlan {
  readonly scope: RegistrationScope;
  readonly desired: readonly RESTPostAPIApplicationCommandsJSONBody[];
  readonly existingCount: number;
  readonly changed: boolean;
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly modified: readonly string[];
}

export interface RegistrationResult extends RegistrationPlan {
  readonly applied: boolean;
}

/**
 * Application command registration.
 *
 * Discord uses bulk overwrite for application commands. This registrar
 * computes a normalized diff first so an already-synchronized command set
 * does not cause another REST write.
 */
export class CommandRegistrar {
  private readonly rest: REST;

  public constructor(private readonly options: RegistrarOptions) {
    this.rest = new REST({ version: '10' }).setToken(options.token);
  }

  /** Calculate what would change without changing Discord. */
  public async plan(
    specs: readonly CommandSpec[],
    scope: RegistrationScope,
  ): Promise<RegistrationPlan> {
    const desired = specs.map(toDiscordCommand);

    assertUniqueNames(desired);

    const existing = await this.fetchExisting(scope);

    const desiredByName = new Map(
      desired.map((command) => [commandKey(command), command]),
    );

    const existingByName = new Map(
      existing.map((command) => [commandKey(command), command]),
    );

    const added = [...desiredByName.keys()]
      .filter((key) => !existingByName.has(key))
      .map(displayCommandKey);

    const removed = [...existingByName.keys()]
      .filter((key) => !desiredByName.has(key))
      .map(displayCommandKey);

    const modified = [...desiredByName.entries()]
      .filter(([key, command]) => {
        const current = existingByName.get(key);

        if (current === undefined) {
          return false;
        }

        return fingerprint(current) !== fingerprint(command);
      })
      .map(([key]) => displayCommandKey(key));

    return {
      scope,
      desired,
      existingCount: existing.length,
      changed: added.length > 0 || removed.length > 0 || modified.length > 0,
      added,
      removed,
      modified,
    };
  }

  /**
   * Apply the plan.
   *
   * Empty command sets are rejected unless explicitly allowed because Discord
   * treats an empty bulk overwrite as deleting the entire command set.
   */
  public async apply(
    specs: readonly CommandSpec[],
    scope: RegistrationScope,
    options: {
      readonly allowEmpty?: boolean;
      readonly force?: boolean;
    } = {},
  ): Promise<RegistrationResult> {
    const plan = await this.plan(specs, scope);

    if (plan.desired.length === 0 && options.allowEmpty !== true) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint:
          `Refusing to register an empty command set for ${this.options.bot}: ` +
          'a bulk overwrite with no commands deletes every command this ' +
          'application has. If that is genuinely what you want, pass ' +
          '--allow-empty.',
        details: {
          bot: this.options.bot,
          scope,
        },
      });
    }

    if (!plan.changed && options.force !== true) {
      this.options.logger.info(
        'commands.register.unchanged',
        `Command set already matches Discord (${String(
          plan.desired.length,
        )} command(s)); nothing sent.`,
        {
          context: {
            scope,
            bot: this.options.bot,
          },
        },
      );

      return {
        ...plan,
        applied: false,
      };
    }

    const route =
      scope === 'guild'
        ? Routes.applicationGuildCommands(this.options.clientId, this.options.guildId)
        : Routes.applicationCommands(this.options.clientId);

    await this.rest.put(route, {
      body: plan.desired,
    });

    this.options.logger.info(
      'commands.register.applied',
      `Registered ${String(plan.desired.length)} command(s) for ${this.options.bot}.`,
      {
        context: {
          scope,
          added: [...plan.added],
          removed: [...plan.removed],
          modified: [...plan.modified],
        },
      },
    );

    return {
      ...plan,
      applied: true,
    };
  }

  private async fetchExisting(
    scope: RegistrationScope,
  ): Promise<readonly RESTPostAPIApplicationCommandsJSONBody[]> {
    const route =
      scope === 'guild'
        ? Routes.applicationGuildCommands(this.options.clientId, this.options.guildId)
        : Routes.applicationCommands(this.options.clientId);

    const response = await this.rest.get(route);

    return response as RESTPostAPIApplicationCommandsJSONBody[];
  }
}

/* -------------------------------------------------------------------------- */
/* Command identity                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Discord scopes application-command uniqueness by (type, name).
 */
function commandKey(command: RESTPostAPIApplicationCommandsJSONBody): string {
  return `${String(command.type ?? 1)}:${command.name}`;
}

function displayCommandKey(key: string): string {
  const separator = key.indexOf(':');

  if (separator < 0) {
    return key;
  }

  return key.slice(separator + 1);
}

/* -------------------------------------------------------------------------- */
/* Fingerprinting                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Only compare fields that represent the actual command definition.
 *
 * Discord returns additional response fields such as IDs and version data.
 * Those are intentionally excluded.
 */
function fingerprint(command: RESTPostAPIApplicationCommandsJSONBody): string {
  const normalised = normalizeCommand(command);

  return createHash('sha256').update(JSON.stringify(normalised)).digest('hex');
}

interface NormalizedCommand {
  readonly name: string;
  readonly type: number;
  readonly description: string;
  readonly default_member_permissions: string | null;
  readonly nsfw: boolean;
  readonly options: readonly NormalizedOption[];
}

function normalizeCommand(
  command: RESTPostAPIApplicationCommandsJSONBody,
): NormalizedCommand {
  /*
   * Context-menu commands do not have a description/options field.
   * Use the discriminator/type to handle the Discord union safely.
   */
  const type = command.type ?? 1;

  const isChatInput = type === 1;

  return {
    name: command.name,
    type,
    description:
      isChatInput && 'description' in command ? normalizeString(command.description) : '',

    default_member_permissions: normalizeNullableString(
      command.default_member_permissions,
    ),

    nsfw: isChatInput && 'nsfw' in command ? (command.nsfw ?? false) : false,

    options: isChatInput && 'options' in command ? normalizeOptions(command.options) : [],
  };
}

interface NormalizedOption {
  readonly name: string;
  readonly description: string;
  readonly type: number;
  readonly required: boolean;
  readonly autocomplete: boolean;
  readonly choices: readonly NormalizedChoice[];
  readonly options: readonly NormalizedOption[];
  readonly channel_types: readonly number[];
  readonly min_value: number | string | null;
  readonly max_value: number | string | null;
  readonly min_length: number | null;
  readonly max_length: number | null;
}

interface NormalizedChoice {
  readonly name: string;
  readonly value: string | number;
}

function normalizeOptions(options: unknown): NormalizedOption[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.map((raw) => normalizeOption(raw));
}

function normalizeOption(value: unknown): NormalizedOption {
  const option = isRecord(value) ? value : {};

  return {
    name: normalizeString(option['name']),

    description: normalizeString(option['description']),

    type: normalizeNumber(option['type'], 1),

    required: Boolean(option['required'] ?? false),

    autocomplete: Boolean(option['autocomplete'] ?? false),

    choices: normalizeChoices(option['choices']),

    options: normalizeOptions(option['options']),

    channel_types: normalizeNumberArray(option['channel_types']),

    min_value: normalizeNullableNumberLike(option['min_value']),

    max_value: normalizeNullableNumberLike(option['max_value']),

    min_length: normalizeNullableNumber(option['min_length']),

    max_length: normalizeNullableNumber(option['max_length']),
  };
}

function normalizeChoices(value: unknown): NormalizedChoice[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((choice) => ({
    name: normalizeString(choice['name']),

    value: normalizeChoiceValue(choice['value']),
  }));
}

/* -------------------------------------------------------------------------- */
/* Primitive normalization                                                     */
/* -------------------------------------------------------------------------- */

function normalizeChoiceValue(value: unknown): string | number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return typeof value === 'string' ? value : null;
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNullableNumberLike(value: unknown): number | string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }

    return value;
  }

  return null;
}

function normalizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeNullableNumber(entry))
    .filter((entry): entry is number => entry !== null)
    .sort((a, b) => a - b);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

function assertUniqueNames(
  commands: readonly RESTPostAPIApplicationCommandsJSONBody[],
): void {
  const seen = new Set<string>();

  for (const command of commands) {
    /*
     * Discord scopes uniqueness by (type, name), so a slash command and a
     * context-menu command may legitimately share a name.
     */
    const key = commandKey(command);

    if (seen.has(key)) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint:
          `Duplicate command "${command.name}" in the registration payload. ` +
          'Discord rejects the whole bulk overwrite when a name repeats.',
        details: {
          command: command.name,
        },
      });
    }

    seen.add(key);
  }
}
