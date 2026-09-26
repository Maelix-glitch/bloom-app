import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputStyle,
  type APIEmbed,
  type InteractionReplyOptions,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import type {
  BloomActionRow,
  BloomButton,
  BloomEmbed,
  BloomMessage,
  BloomModal,
  BloomSelectMenu,
  ButtonStyle as BloomButtonStyle,
} from '@bloom/embeds';

/**
 * Translate Bloom message DTOs into discord.js payloads.
 *
 * This file is the entire cost of keeping presentation library-agnostic, and it
 * is a cheap price: when a builder API changes, this is what gets edited.
 *
 * Two current-API details worth naming, because both are recently changed and
 * both are easy to get wrong from older material:
 *
 *   • Ephemerality is `flags: MessageFlags.Ephemeral`. The old `ephemeral: true`
 *     option is deprecated in 14.27 and removed in v15.
 *   • Mass mentions are disabled on every outbound message via `allowedMentions`.
 *     That is the real control against a member's text pinging the server — the
 *     text escaping in @bloom/utils is only defence in depth.
 */

const BUTTON_STYLES: Readonly<Record<BloomButtonStyle, ButtonStyle>> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
  link: ButtonStyle.Link,
};

export function toEmbed(embed: BloomEmbed): EmbedBuilder {
  const builder = new EmbedBuilder();

  if (embed.title !== undefined) builder.setTitle(embed.title);
  if (embed.description !== undefined) builder.setDescription(embed.description);
  if (embed.colour !== undefined) builder.setColor(embed.colour);
  if (embed.url !== undefined) builder.setURL(embed.url);
  if (embed.footer !== undefined) builder.setFooter({ text: embed.footer });
  if (embed.timestamp !== undefined) builder.setTimestamp(embed.timestamp);
  if (embed.fields && embed.fields.length > 0) {
    builder.addFields(
      embed.fields.map((field) => ({
        name: field.name,
        value: field.value,
        inline: field.inline ?? false,
      })),
    );
  }

  return builder;
}

function toButton(button: BloomButton): ButtonBuilder {
  const builder = new ButtonBuilder()
    .setLabel(button.label)
    .setStyle(BUTTON_STYLES[button.style]);

  // Discord accepts exactly one of url (link buttons) or custom_id (everything
  // else). Sending both is a 400, so the branch is not optional.
  if (button.style === 'link') {
    if (!button.url) throw new Error(`Link button "${button.label}" has no url.`);
    builder.setURL(button.url);
  } else {
    if (!button.customId) throw new Error(`Button "${button.label}" has no customId.`);
    builder.setCustomId(button.customId);
  }

  if (button.disabled === true) builder.setDisabled(true);
  return builder;
}

function toSelectMenu(menu: BloomSelectMenu): StringSelectMenuBuilder {
  const builder = new StringSelectMenuBuilder().setCustomId(menu.customId).addOptions(
    menu.options.map((option) => {
      const optionBuilder = new StringSelectMenuOptionBuilder()
        .setLabel(option.label)
        .setValue(option.value);
      if (option.description !== undefined)
        optionBuilder.setDescription(option.description);
      if (option.default === true) optionBuilder.setDefault(true);
      return optionBuilder;
    }),
  );

  if (menu.placeholder !== undefined) builder.setPlaceholder(menu.placeholder);
  if (menu.minValues !== undefined) builder.setMinValues(menu.minValues);
  if (menu.maxValues !== undefined) builder.setMaxValues(menu.maxValues);
  if (menu.disabled === true) builder.setDisabled(true);
  return builder;
}

function toActionRow(
  row: BloomActionRow,
): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const builder = new ActionRowBuilder<MessageActionRowComponentBuilder>();
  for (const component of row.components) {
    builder.addComponents(
      component.kind === 'button' ? toButton(component) : toSelectMenu(component),
    );
  }
  return builder;
}

/**
 * Build a modal.
 *
 * Uses the current component model: a modal holds **label** components, each
 * wrapping one input. The older shape — text inputs carrying their own label
 * inside an action row — is deprecated in 14.27 and removed in v15, and it is
 * what almost every tutorial still shows.
 */
export function toModal(modal: BloomModal): ModalBuilder {
  const builder = new ModalBuilder().setCustomId(modal.customId).setTitle(modal.title);

  for (const field of modal.fields) {
    builder.addLabelComponents(
      new LabelBuilder().setLabel(field.label).setTextInputComponent((input) => {
        input
          .setCustomId(field.customId)
          .setStyle(
            field.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short,
          )
          .setRequired(field.required ?? true);

        if (field.placeholder !== undefined) input.setPlaceholder(field.placeholder);
        if (field.minLength !== undefined) input.setMinLength(field.minLength);
        if (field.maxLength !== undefined) input.setMaxLength(field.maxLength);
        return input;
      }),
    );
  }

  return builder;
}

/**
 * Build the reply payload.
 *
 * `allowedMentions: { parse: [] }` on every message. A moderation reason quoting
 * a member's `@everyone` must never actually ping the server, and the only
 * reliable way to guarantee that is to disable mention parsing at the API level
 * rather than trusting string sanitisation.
 */
export function toReplyOptions(message: BloomMessage): InteractionReplyOptions {
  const options: InteractionReplyOptions = {
    allowedMentions: { parse: [] },
    ...(message.content === undefined ? {} : { content: message.content }),
    ...(message.embeds && message.embeds.length > 0
      ? { embeds: message.embeds.map((embed) => toEmbed(embed)) }
      : {}),
    ...(message.rows && message.rows.length > 0
      ? { components: message.rows.map(toActionRow) }
      : {}),
    ...(message.ephemeral === true ? { flags: MessageFlags.Ephemeral } : {}),
  };
  return options;
}

/** Same payload for a channel send, which has no ephemeral concept. */
export function toChannelMessageOptions(message: BloomMessage): {
  content?: string;
  embeds?: APIEmbed[];
  components?: ActionRowBuilder<MessageActionRowComponentBuilder>[];
  allowedMentions: { parse: [] };
} {
  return {
    allowedMentions: { parse: [] },
    ...(message.content === undefined ? {} : { content: message.content }),
    ...(message.embeds && message.embeds.length > 0
      ? { embeds: message.embeds.map((embed) => toEmbed(embed).toJSON()) }
      : {}),
    ...(message.rows && message.rows.length > 0
      ? { components: message.rows.map(toActionRow) }
      : {}),
  };
}
