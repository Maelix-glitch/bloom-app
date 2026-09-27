import {
  unsafeSnowflake,
  type ChannelId,
  type CorrelationId,
  type GuildId,
  type InteractionId,
} from '@bloom/shared-types';
import type { BloomMessage, BloomModal } from '@bloom/embeds';
import type { AuthorizationSubject } from '@bloom/permissions';
import type {
  CommandInvocation,
  InteractionOptions,
  ModalInvocation,
  InteractionResponder,
  ResolvedChannel,
  ResolvedRole,
  ResolvedUser,
} from '@bloom/commands';
import { TEST_CHANNEL_IDS, TEST_GUILD_ID, testSubject } from './fixtures.js';

/**
 * A responder that records.
 *
 * Also enforces Discord's actual rules — one initial response, no modal after
 * deferring — because a fake that accepts anything would let a double-reply bug
 * through to production, where it surfaces as "This interaction failed".
 */
export class RecordingResponder implements InteractionResponder {
  public readonly messages: BloomMessage[] = [];
  public readonly modals: BloomModal[] = [];
  public deferred = false;
  public replied = false;
  public deferredEphemeral: boolean | null = null;

  public defer(options: { readonly ephemeral?: boolean } = {}): Promise<void> {
    if (this.deferred || this.replied) {
      return Promise.reject(new Error('Interaction has already been acknowledged.'));
    }
    this.deferred = true;
    this.deferredEphemeral = options.ephemeral ?? true;
    return Promise.resolve();
  }

  public reply(message: BloomMessage): Promise<void> {
    if (this.deferred || this.replied) {
      return Promise.reject(new Error('Interaction has already been acknowledged.'));
    }
    this.replied = true;
    this.messages.push(message);
    return Promise.resolve();
  }

  public editReply(message: BloomMessage): Promise<void> {
    if (!this.deferred && !this.replied) {
      return Promise.reject(new Error('Cannot edit a reply before responding.'));
    }
    this.replied = true;
    this.messages.push(message);
    return Promise.resolve();
  }

  public followUp(message: BloomMessage): Promise<void> {
    if (!this.deferred && !this.replied) {
      return Promise.reject(new Error('Cannot follow up before responding.'));
    }
    this.messages.push(message);
    return Promise.resolve();
  }

  public showModal(modal: BloomModal): Promise<void> {
    if (this.deferred || this.replied) {
      return Promise.reject(new Error('Cannot show a modal after acknowledging.'));
    }
    this.replied = true;
    this.modals.push(modal);
    return Promise.resolve();
  }

  public get last(): BloomMessage | undefined {
    return this.messages.at(-1);
  }

  /** Concatenated text of every response — for asserting what a member can see. */
  public get visibleText(): string {
    return this.messages
      .flatMap((message) => [
        message.content ?? '',
        ...(message.embeds ?? []).flatMap((embed) => [
          embed.title ?? '',
          embed.description ?? '',
          embed.footer ?? '',
          ...(embed.fields ?? []).flatMap((field) => [field.name, field.value]),
        ]),
      ])
      .join('\n');
  }
}

export interface FakeOptionValues {
  readonly strings?: Readonly<Record<string, string>>;
  readonly integers?: Readonly<Record<string, number>>;
  readonly numbers?: Readonly<Record<string, number>>;
  readonly booleans?: Readonly<Record<string, boolean>>;
  readonly users?: Readonly<Record<string, ResolvedUser>>;
  readonly roles?: Readonly<Record<string, ResolvedRole>>;
  readonly channels?: Readonly<Record<string, ResolvedChannel>>;
  readonly subcommand?: string;
  readonly subcommandGroup?: string;
}

export class FakeOptions implements InteractionOptions {
  public constructor(private readonly values: FakeOptionValues = {}) {}

  public getString(name: string): string | null {
    return this.values.strings?.[name] ?? null;
  }

  public getInteger(name: string): number | null {
    return this.values.integers?.[name] ?? null;
  }

  public getNumber(name: string): number | null {
    return this.values.numbers?.[name] ?? null;
  }

  public getBoolean(name: string): boolean | null {
    return this.values.booleans?.[name] ?? null;
  }

  public getUser(name: string): ResolvedUser | null {
    return this.values.users?.[name] ?? null;
  }

  public getRole(name: string): ResolvedRole | null {
    return this.values.roles?.[name] ?? null;
  }

  public getChannel(name: string): ResolvedChannel | null {
    return this.values.channels?.[name] ?? null;
  }

  public getSubcommand(): string | null {
    return this.values.subcommand ?? null;
  }

  public getSubcommandGroup(): string | null {
    return this.values.subcommandGroup ?? null;
  }
}

/**
 * Interaction ids must differ between invocations.
 *
 * Discord issues a fresh id for every interaction, and code that keys
 * idempotency on one — as the small-win award does — is only exercised
 * correctly if the fake does the same. A constant id here made three separate
 * commands look like one replayed command, which is a failure that would have
 * shipped as "the daily cap works".
 */
let nextInteraction = 5001;

export interface FakeInvocationOptions {
  readonly commandName: string;
  /** Pin the id to replay one interaction deliberately, e.g. a Discord retry. */
  readonly interactionId?: InteractionId;
  readonly subcommand?: string;
  readonly subcommandGroup?: string;
  readonly actor?: AuthorizationSubject;
  readonly guildId?: GuildId | null;
  readonly channelId?: ChannelId | null;
  readonly options?: FakeOptionValues;
  readonly correlationId?: CorrelationId;
  readonly createdAt?: Date;
}

export interface FakeInvocation {
  readonly invocation: CommandInvocation;
  readonly responder: RecordingResponder;
}

export function fakeInvocation(options: FakeInvocationOptions): FakeInvocation {
  const responder = new RecordingResponder();
  const optionValues: FakeOptionValues = {
    ...options.options,
    ...(options.subcommand === undefined ? {} : { subcommand: options.subcommand }),
    ...(options.subcommandGroup === undefined
      ? {}
      : { subcommandGroup: options.subcommandGroup }),
  };

  const commandPath = [options.commandName, options.subcommandGroup, options.subcommand]
    .filter(Boolean)
    .join(' ');

  return {
    responder,
    invocation: {
      interactionId:
        options.interactionId ??
        unsafeSnowflake<InteractionId>(
          `9000000000000${String(nextInteraction++).padStart(5, '0')}`,
        ),
      commandName: options.commandName,
      commandPath,
      guildId: options.guildId === undefined ? TEST_GUILD_ID : options.guildId,
      channelId:
        options.channelId === undefined
          ? TEST_CHANNEL_IDS.introductions
          : options.channelId,
      actor: options.actor ?? testSubject(),
      options: new FakeOptions(optionValues),
      respond: responder,
      correlationId: options.correlationId ?? ('test-correlation-id' as CorrelationId),
      createdAt: options.createdAt ?? new Date('2026-01-01T09:00:00.000Z'),
    },
  };
}

/**
 * A submitted modal.
 *
 * Separate ids from the command sequence, and still sequential: a modal
 * submission is its own interaction with its own id, and a fake that reused the
 * opening command's id would make a replayed submission indistinguishable from
 * a fresh one.
 */
let nextModal = 7001;

export interface FakeModalOptions {
  readonly customId: string;
  /** Field values, keyed by the field's custom id. */
  readonly fields?: Readonly<Record<string, string>>;
  readonly actor?: AuthorizationSubject;
  readonly guildId?: GuildId | null;
  readonly channelId?: ChannelId | null;
  readonly correlationId?: CorrelationId;
  readonly createdAt?: Date;
}

export interface FakeModalSubmission {
  readonly invocation: ModalInvocation;
  readonly responder: RecordingResponder;
}

export function fakeModalSubmission(options: FakeModalOptions): FakeModalSubmission {
  const responder = new RecordingResponder();

  return {
    responder,
    invocation: {
      interactionId: unsafeSnowflake<InteractionId>(
        `9100000000000${String(nextModal++).padStart(5, '0')}`,
      ),
      customId: options.customId,
      guildId: options.guildId === undefined ? TEST_GUILD_ID : options.guildId,
      channelId:
        options.channelId === undefined
          ? TEST_CHANNEL_IDS.introductions
          : options.channelId,
      actor: options.actor ?? testSubject(),
      fields: new Map(Object.entries(options.fields ?? {})),
      respond: responder,
      correlationId: options.correlationId ?? ('test-correlation-id' as CorrelationId),
      createdAt: options.createdAt ?? new Date('2026-01-01T09:00:00.000Z'),
    },
  };
}
