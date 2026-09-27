import {
  MessageFlags,
  type ChatInputCommandInteraction,
  type GuildMember,
  type ModalSubmitInteraction,
  type MessageComponentInteraction,
} from 'discord.js';
import {
  unsafeSnowflake,
  type ChannelId,
  type CorrelationId,
  type GuildId,
  type InteractionId,
  type MessageId,
  type RoleId,
  type UserId,
} from '@bloom/shared-types';
import type { AuthorizationSubject } from '@bloom/permissions';
import type {
  CommandInvocation,
  ComponentInvocation,
  InteractionOptions,
  InteractionResponder,
  ModalInvocation,
  ResolvedChannel,
  ResolvedRole,
  ResolvedUser,
} from '@bloom/commands';
import type { BloomMessage, BloomModal } from '@bloom/embeds';
import { toModal, toReplyOptions } from './message.js';

/**
 * Build the authorization subject from Discord's own member object.
 *
 * This is the single place the platform decides "who is this and what do they
 * have", and every field comes from the signed interaction payload Discord
 * sent — never from anything the client asserted. That is the mechanical
 * meaning of the brief's "do not trust the command author's client-side claims".
 *
 * `member.permissions` is Discord's computed value for this member in this
 * context, already accounting for role permissions and channel overwrites.
 */
export function toAuthorizationSubject(member: GuildMember): AuthorizationSubject {
  const roleIds = [...member.roles.cache.keys()].map((id) => unsafeSnowflake<RoleId>(id));

  return {
    userId: unsafeSnowflake<UserId>(member.id),
    guildId: unsafeSnowflake<GuildId>(member.guild.id),
    roleIds,
    permissions: member.permissions.bitfield,
    isGuildOwner: member.guild.ownerId === member.id,
    // `roles.highest` is the @everyone role when a member has no others, whose
    // position is 0 — the correct floor for the comparison.
    highestRolePosition: member.roles.highest.position,
  };
}

class DiscordOptions implements InteractionOptions {
  public constructor(private readonly interaction: ChatInputCommandInteraction) {}

  public getString(name: string): string | null {
    return this.interaction.options.getString(name);
  }

  public getInteger(name: string): number | null {
    return this.interaction.options.getInteger(name);
  }

  public getNumber(name: string): number | null {
    return this.interaction.options.getNumber(name);
  }

  public getBoolean(name: string): boolean | null {
    return this.interaction.options.getBoolean(name);
  }

  public getUser(name: string): ResolvedUser | null {
    const user = this.interaction.options.getUser(name);
    if (!user) return null;
    return {
      id: unsafeSnowflake<UserId>(user.id),
      username: user.username,
      isBot: user.bot,
    };
  }

  public getRole(name: string): ResolvedRole | null {
    const role = this.interaction.options.getRole(name);
    if (!role) return null;
    return {
      id: unsafeSnowflake<RoleId>(role.id),
      name: role.name,
      position: role.position,
      managed: role.managed,
    };
  }

  public getChannel(name: string): ResolvedChannel | null {
    const channel = this.interaction.options.getChannel(name);
    if (!channel) return null;
    return {
      id: unsafeSnowflake<ChannelId>(channel.id),
      // A channel option can resolve to a type without a name; '' keeps the
      // DTO total rather than leaking null into every consumer.
      name: channel.name ?? '',
      type: channel.type,
    };
  }

  public getSubcommand(): string | null {
    // `false` suppresses the throw when the command has no subcommands.
    return this.interaction.options.getSubcommand(false);
  }

  public getSubcommandGroup(): string | null {
    return this.interaction.options.getSubcommandGroup(false);
  }
}

type AnyRespondableInteraction =
  ChatInputCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction;

/**
 * Responder.
 *
 * Tracks `deferred`/`replied` from the live interaction rather than keeping its
 * own flags, so the dispatcher's decision about reply-vs-edit-vs-followUp is
 * based on what Discord actually knows.
 */
class DiscordResponder implements InteractionResponder {
  public constructor(private readonly interaction: AnyRespondableInteraction) {}

  public get deferred(): boolean {
    return this.interaction.deferred;
  }

  public get replied(): boolean {
    return this.interaction.replied;
  }

  public async defer(options: { readonly ephemeral?: boolean } = {}): Promise<void> {
    await this.interaction.deferReply(
      options.ephemeral === false ? {} : { flags: MessageFlags.Ephemeral },
    );
  }

  public async reply(message: BloomMessage): Promise<void> {
    await this.interaction.reply(toReplyOptions(message));
  }

  public async editReply(message: BloomMessage): Promise<void> {
    // An edit cannot change ephemerality — that was fixed by the initial
    // response — so the flag is dropped rather than sent and ignored. Discord's
    // edit payload type does not accept the Ephemeral flag at all.
    const { ephemeral: _ephemeral, ...rest } = message;
    const { flags: _flags, ...editable } = toReplyOptions(rest);
    await this.interaction.editReply(editable);
  }

  public async followUp(message: BloomMessage): Promise<void> {
    await this.interaction.followUp(toReplyOptions(message));
  }

  public async showModal(modal: BloomModal): Promise<void> {
    if (this.interaction.deferred || this.interaction.replied) {
      throw new Error(
        'Cannot show a modal after replying or deferring. Discord only accepts a modal as the initial response to an interaction.',
      );
    }
    if (!('showModal' in this.interaction)) {
      throw new Error('This interaction type cannot show a modal.');
    }
    await this.interaction.showModal(toModal(modal));
  }
}

/** Full command path, for logs and telemetry: `guardian onboarding status`. */
function commandPath(interaction: ChatInputCommandInteraction): string {
  const group = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand(false);
  return [interaction.commandName, group, subcommand].filter(Boolean).join(' ');
}

export function toCommandInvocation(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
  correlationId: CorrelationId,
): CommandInvocation {
  return {
    interactionId: unsafeSnowflake<InteractionId>(interaction.id),
    commandName: interaction.commandName,
    commandPath: commandPath(interaction),
    guildId: interaction.guildId ? unsafeSnowflake<GuildId>(interaction.guildId) : null,
    channelId: interaction.channelId
      ? unsafeSnowflake<ChannelId>(interaction.channelId)
      : null,
    actor: toAuthorizationSubject(member),
    options: new DiscordOptions(interaction),
    respond: new DiscordResponder(interaction),
    correlationId,
    createdAt: interaction.createdAt,
  };
}

export function toComponentInvocation(
  interaction: MessageComponentInteraction,
  member: GuildMember,
  correlationId: CorrelationId,
): ComponentInvocation {
  const values = interaction.isStringSelectMenu() ? interaction.values : [];

  return {
    interactionId: unsafeSnowflake<InteractionId>(interaction.id),
    customId: interaction.customId,
    guildId: interaction.guildId ? unsafeSnowflake<GuildId>(interaction.guildId) : null,
    channelId: interaction.channelId
      ? unsafeSnowflake<ChannelId>(interaction.channelId)
      : null,
    messageId: unsafeSnowflake<MessageId>(interaction.message.id),
    actor: toAuthorizationSubject(member),
    values,
    respond: new DiscordResponder(interaction),
    correlationId,
    createdAt: interaction.createdAt,
  };
}

export function toModalInvocation(
  interaction: ModalSubmitInteraction,
  member: GuildMember,
  correlationId: CorrelationId,
): ModalInvocation {
  const fields = new Map<string, string>();
  for (const row of interaction.fields.fields.values()) {
    // Modals can now carry components that have no single string value
    // (checkbox groups, selects). Only text inputs are collected here; a
    // feature that needs the others should read them explicitly.
    if ('value' in row && typeof row.value === 'string') {
      fields.set(row.customId, row.value);
    }
  }

  return {
    interactionId: unsafeSnowflake<InteractionId>(interaction.id),
    customId: interaction.customId,
    guildId: interaction.guildId ? unsafeSnowflake<GuildId>(interaction.guildId) : null,
    channelId: interaction.channelId
      ? unsafeSnowflake<ChannelId>(interaction.channelId)
      : null,
    actor: toAuthorizationSubject(member),
    fields,
    respond: new DiscordResponder(interaction),
    correlationId,
    createdAt: interaction.createdAt,
  };
}
