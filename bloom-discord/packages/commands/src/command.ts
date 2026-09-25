import { BOT_DISPLAY_NAMES, bloomError, type BotName } from '@bloom/shared-types';
import type { AuthorizationContext, AuthorizationPolicy } from '@bloom/permissions';
import type { BloomMessage } from '@bloom/embeds';
import type { CommandInvocation } from './invocation.js';
import type { SlashCommandSpec } from './spec.js';

/**
 * A command.
 *
 * `spec` is what Discord is told. `policy` is what we enforce. They are
 * separate fields on purpose: Discord's `default_member_permissions` can be
 * overridden by a server administrator at any time, so it is a hint about
 * visibility, not a guarantee about execution. The brief's rule — "do not
 * assume that because a user can type a slash command they should be allowed to
 * execute it" — is exactly this split.
 *
 * `execute` returns a message rather than sending one. Handlers that return
 * data instead of performing I/O are trivially testable, and it keeps every
 * response flowing through the same dispatcher, which is where ephemerality,
 * error handling and telemetry are applied consistently.
 */
export interface BloomCommand<TDeps = unknown> {
  readonly spec: SlashCommandSpec;
  /** Which bot owns this command. Used to prevent cross-bot registration mistakes. */
  readonly bot: BotName;
  readonly policy: AuthorizationPolicy;

  /**
   * Whether the response is visible only to the caller.
   *
   * Defaults to ephemeral everywhere. Public replies from a bot are noise
   * unless the whole channel benefits, and Bloom is explicitly not a noisy
   * server. Anything staff-facing must stay ephemeral regardless.
   */
  readonly ephemeral?: boolean;

  /**
   * Whether to defer before executing.
   *
   * Set this on anything that touches the database or the Discord API more than
   * trivially. Discord's acknowledgement budget is 3 seconds and a cold pooler
   * connection can eat most of it.
   *
   * A predicate, rather than a plain boolean, for one specific reason: a modal
   * may only be sent as the *initial* response to an interaction, so a command
   * that shows one must not defer — and a namespace command is a single command
   * whose branches disagree about that. `/labs bug show` wants deferring;
   * `/labs bug report` opens a form and must not. Deciding per invocation is
   * what lets both live under one namespace, which is the whole point of
   * namespacing.
   */
  readonly defer?: boolean | ((invocation: CommandInvocation) => boolean);

  /*
   * A handler either returns a message for the dispatcher to send, or responds
   * itself and returns nothing. Modelling that as `| undefined` would force
   * every handler to write an explicit `return undefined`.
   */
  /**
   * `authContext` is the very context this command's `policy` was already
   * evaluated against.
   *
   * Passed down rather than rebuilt so that a composed command can apply a
   * narrower policy to one branch — see `namespaceCommand` — without being
   * handed the platform configuration separately. Most handlers ignore it.
   */
  execute(
    invocation: CommandInvocation,
    deps: TDeps,
    authContext: AuthorizationContext,
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  ): Promise<BloomMessage | void>;
}

/**
 * Whether this invocation should be deferred.
 *
 * One function, used by the dispatcher and by the tests that assert a bot's
 * commands acknowledge before doing slow work. Resolving the predicate in two
 * places would let those two disagree, and the test would be the one that was
 * wrong.
 */
export function shouldDefer<TDeps>(
  command: BloomCommand<TDeps>,
  invocation: CommandInvocation,
): boolean {
  return typeof command.defer === 'function'
    ? command.defer(invocation)
    : command.defer === true;
}

/**
 * The command registry for one bot.
 *
 * Collision detection is the point. Three applications in one server, each with
 * its own command tree, is a real chance of two bots claiming `/report` — and
 * the symptom is a member seeing two identical commands with no way to tell
 * them apart. Registering a duplicate name throws at startup instead.
 */
export class CommandRegistry<TDeps> {
  private readonly commands = new Map<string, BloomCommand<TDeps>>();

  public constructor(private readonly bot: BotName) {}

  public register(command: BloomCommand<TDeps>): this {
    if (command.bot !== this.bot) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Command "/${command.spec.name}" belongs to ${BOT_DISPLAY_NAMES[command.bot]} but was registered on ${BOT_DISPLAY_NAMES[this.bot]}. Each bot registers only its own commands.`,
        details: {
          command: command.spec.name,
          declared_bot: command.bot,
          registry: this.bot,
        },
      });
    }

    const existing = this.commands.get(command.spec.name);
    if (existing) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Two commands are registered as "/${command.spec.name}" on ${BOT_DISPLAY_NAMES[this.bot]}. Command names must be unique per application.`,
        details: { command: command.spec.name },
      });
    }

    this.commands.set(command.spec.name, command);
    return this;
  }

  public registerAll(commands: readonly BloomCommand<TDeps>[]): this {
    for (const command of commands) this.register(command);
    return this;
  }

  public get(name: string): BloomCommand<TDeps> | undefined {
    return this.commands.get(name);
  }

  public all(): readonly BloomCommand<TDeps>[] {
    return [...this.commands.values()];
  }

  public specs(): readonly SlashCommandSpec[] {
    return this.all().map((command) => command.spec);
  }

  public get size(): number {
    return this.commands.size;
  }
}
