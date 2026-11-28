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
 * Idempotency comes from the endpoint, not from bookkeeping: Discord's bulk
 * overwrite (`PUT .../commands`) replaces the entire command set with whatever
 * is sent. Running it twice with the same input produces the same result, and
 * there is no way to accumulate duplicate commands — which is the failure the
 * brief warns about, and which every "register each command individually"
 * approach eventually hits.
 *
 * On top of that, this class diffs before it writes, so a no-op deploy is
 * genuinely a no-op rather than a rewrite that churns command ids.
 */
export class CommandRegistrar {
  private readonly rest: REST;

  public constructor(private readonly options: RegistrarOptions) {
    this.rest = new REST({ version: '10' }).setToken(options.token);
  }

  /** What would change, without changing it. */
  public async plan(
    specs: readonly CommandSpec[],
    scope: RegistrationScope,
  ): Promise<RegistrationPlan> {
    const desired = specs.map(toDiscordCommand);
    assertUniqueNames(desired);

    const existing = await this.fetchExisting(scope);

    const desiredByName = new Map(desired.map((command) => [command.name, command]));
    const existingByName = new Map(existing.map((command) => [command.name, command]));

    const added = [...desiredByName.keys()].filter((name) => !existingByName.has(name));
    const removed = [...existingByName.keys()].filter((name) => !desiredByName.has(name));
    const modified = [...desiredByName.entries()]
      .filter(([name, command]) => {
        const current = existingByName.get(name);
        return current !== undefined && fingerprint(current) !== fingerprint(command);
      })
      .map(([name]) => name);

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
   * Refuses to publish an empty command set unless explicitly allowed. An empty
   * array is a *valid* bulk overwrite that deletes every command — which is
   * exactly what happens if the registry failed to load, and it would be
   * indistinguishable from a successful deploy until members noticed every
   * command had vanished.
   */
  public async apply(
    specs: readonly CommandSpec[],
    scope: RegistrationScope,
    options: { readonly allowEmpty?: boolean; readonly force?: boolean } = {},
  ): Promise<RegistrationResult> {
    const plan = await this.plan(specs, scope);

    if (plan.desired.length === 0 && options.allowEmpty !== true) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Refusing to register an empty command set for ${this.options.bot}: a bulk overwrite with no commands deletes every command this application has. If that is genuinely what you want, pass --allow-empty.`,
        details: { bot: this.options.bot, scope },
      });
    }

    if (!plan.changed && options.force !== true) {
      this.options.logger.info(
        'commands.register.unchanged',
        `Command set already matches Discord (${String(plan.desired.length)} command(s)); nothing sent.`,
        { context: { scope, bot: this.options.bot } },
      );
      return { ...plan, applied: false };
    }

    const route =
      scope === 'guild'
        ? Routes.applicationGuildCommands(this.options.clientId, this.options.guildId)
        : Routes.applicationCommands(this.options.clientId);

    await this.rest.put(route, { body: plan.desired });

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

    return { ...plan, applied: true };
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

/**
 * Compare only the fields we control.
 *
 * Discord's response carries ids, version stamps and defaults it filled in
 * itself. Hashing the raw response against our payload would report every
 * command as modified on every run, which would make the diff useless and push
 * people to `--force`.
 */
function fingerprint(command: RESTPostAPIApplicationCommandsJSONBody): string {
  const normalised = {
    name: command.name,
    description: 'description' in command ? (command.description ?? '') : '',
    type: command.type ?? 1,
    default_member_permissions: command.default_member_permissions ?? null,
    contexts: [...(command.contexts ?? [])].sort((a, b) => a - b),
    integration_types: [...(command.integration_types ?? [])].sort((a, b) => a - b),
    options: 'options' in command ? normaliseOptions(command.options) : [],
  };
  return createHash('sha256').update(JSON.stringify(normalised)).digest('hex');
}

interface RawOption {
  name: string;
  description?: string;
  type: number;
  required?: boolean;
  choices?: { name: string; value: string | number }[];
  options?: RawOption[];
}

function normaliseOptions(options: unknown): unknown[] {
  if (!Array.isArray(options)) return [];
  return (options as RawOption[]).map((option) => ({
    name: option.name,
    description: option.description ?? '',
    type: option.type,
    required: option.required ?? false,
    choices: option.choices ?? [],
    options: normaliseOptions(option.options),
  }));
}

function assertUniqueNames(
  commands: readonly RESTPostAPIApplicationCommandsJSONBody[],
): void {
  const seen = new Set<string>();
  for (const command of commands) {
    // Discord scopes uniqueness by (type, name) — a slash command and a user
    // context-menu entry may share a name.
    const key = `${String(command.type ?? 1)}:${command.name}`;
    if (seen.has(key)) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Duplicate command "${command.name}" in the registration payload. Discord rejects the whole bulk overwrite when a name repeats.`,
        details: { command: command.name },
      });
    }
    seen.add(key);
  }
}
