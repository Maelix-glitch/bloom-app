import type {
  ChannelId,
  CorrelationId,
  GuildId,
  InteractionId,
  MessageId,
  RoleId,
  UserId,
} from '@bloom/shared-types';
import type { AuthorizationSubject } from '@bloom/permissions';
import type { BloomMessage, BloomModal } from '@bloom/embeds';

/**
 * Everything a handler needs from an interaction, with no discord.js in sight.
 *
 * This is the adapter seam. `packages/discord` builds one of these from a
 * `ChatInputCommandInteraction`; `packages/testing` builds one from a literal.
 * A command handler cannot tell the difference, which is what makes command
 * logic testable without a gateway.
 */

export interface ResolvedUser {
  readonly id: UserId;
  readonly username: string;
  readonly isBot: boolean;
}

export interface ResolvedRole {
  readonly id: RoleId;
  readonly name: string;
  readonly position: number;
  readonly managed: boolean;
}

export interface ResolvedChannel {
  readonly id: ChannelId;
  readonly name: string;
  /** Discord channel type id. */
  readonly type: number;
}

/**
 * Typed option access.
 *
 * Returns `null` for absent options rather than throwing. Required-ness is
 * declared in the command spec and enforced by Discord before the interaction
 * reaches us, so a handler reading a required option can assert — but the
 * signature stays honest about what the type system can actually guarantee.
 */
export interface InteractionOptions {
  getString(name: string): string | null;
  getInteger(name: string): number | null;
  getNumber(name: string): number | null;
  getBoolean(name: string): boolean | null;
  getUser(name: string): ResolvedUser | null;
  getRole(name: string): ResolvedRole | null;
  getChannel(name: string): ResolvedChannel | null;
  getSubcommand(): string | null;
  getSubcommandGroup(): string | null;
}

/**
 * Responding to an interaction.
 *
 * Discord requires an acknowledgement within 3 seconds and allows exactly one
 * initial response. Modelling `deferred`/`replied` explicitly means the error
 * boundary can always find a way to tell the member something, instead of
 * throwing "interaction has already been acknowledged" on top of the original
 * failure.
 */
export interface InteractionResponder {
  readonly deferred: boolean;
  readonly replied: boolean;

  defer(options?: { readonly ephemeral?: boolean }): Promise<void>;
  reply(message: BloomMessage): Promise<void>;
  editReply(message: BloomMessage): Promise<void>;
  followUp(message: BloomMessage): Promise<void>;

  /**
   * Show a modal. Mutually exclusive with defer/reply — Discord only accepts a
   * modal as the *initial* response to an interaction.
   */
  showModal(modal: BloomModal): Promise<void>;
}

export interface CommandInvocation {
  readonly interactionId: InteractionId;
  /** Full command path, e.g. `guardian onboarding status`. Used for logs and telemetry. */
  readonly commandPath: string;
  readonly commandName: string;

  readonly guildId: GuildId | null;
  readonly channelId: ChannelId | null;

  /** Built from Discord's own member data, never from client-supplied claims. */
  readonly actor: AuthorizationSubject;

  readonly options: InteractionOptions;
  readonly respond: InteractionResponder;

  readonly correlationId: CorrelationId;
  /** When Discord created the interaction — the clock the 3s budget runs against. */
  readonly createdAt: Date;
}

/** A button press or select-menu choice. */
export interface ComponentInvocation {
  readonly interactionId: InteractionId;
  readonly customId: string;
  readonly guildId: GuildId | null;
  readonly channelId: ChannelId | null;
  readonly messageId: MessageId | null;
  readonly actor: AuthorizationSubject;
  /** Values chosen, for select menus. Empty for buttons. */
  readonly values: readonly string[];
  readonly respond: InteractionResponder;
  readonly correlationId: CorrelationId;
  readonly createdAt: Date;
}

/** A submitted modal. */
export interface ModalInvocation {
  readonly interactionId: InteractionId;
  readonly customId: string;
  readonly guildId: GuildId | null;
  readonly channelId: ChannelId | null;
  readonly actor: AuthorizationSubject;
  readonly fields: ReadonlyMap<string, string>;
  readonly respond: InteractionResponder;
  readonly correlationId: CorrelationId;
  readonly createdAt: Date;
}
